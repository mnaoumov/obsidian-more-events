import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import type { PdfOutlineMenuItem } from './more-events-api.ts';

import { PDF_OUTLINE_MENU_EVENT_NAME } from './more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

interface MenuRecord {
  /**
   * The paths of the files open in the leaves the listener was given.
   */
  filePaths: string[];

  /**
   * The outline items the listener was given.
   */
  outlineItems: PdfOutlineMenuItem[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];

  /**
   * The view types of the leaves the listener was given.
   */
  subjects: string[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. The announcement rests on when the
 * outline item's menu is shown after the `await`s in its listener, which this suite measured: with the item's page
 * already resolved they settle inside the dispatch, so `currentTarget` is still the item's `selfEl`. It rests too on
 * the PDF view reaching the outline's items as `viewer.child.pdfViewer.pdfOutlineViewer.allItems`, which only a real
 * trusted right-click through the real listener proves.
 *
 * The PDF is written by the suite itself, three pages of plain text and an outline of two items pointing at pages 2
 * and 3. It right-clicks the second item, so an item or a page number read from the wrong place fails.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`, and the outline menu itself is
 * the same on mobile.
 */
describe('PDF outline menu events', () => {
  it('should let a listener add an item to the menu of an outline item', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickOutlineItem();

    expect(record.subjects).toEqual(['pdf']);
    expect(record.filePaths).toEqual(['More Events outline test.pdf']);
    expect(record.outlineItems).toEqual([{ pageNumber: 3, title: 'Chapter two' }]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Copy link to “Chapter two”');
  });
});

/**
 * Writes a three-page PDF with an outline, opens it, shows its outline, right-clicks the second outline item with a
 * trusted click, and records what the listener saw and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function rightClickOutlineItem(): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      lib,
      PDF_OUTLINE_MENU_EVENT_NAME: pdfOutlineMenuEventName
    }): Promise<MenuRecord> {
      const {
        clickMouse,
        waitUntil
      } = lib;
      // Two waits at 12 s declare 24 s in one transport call, under the 30 s a desktop closure gets.
      const WAIT_TIMEOUT_IN_MS = 12_000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const PDF_PATH = 'More Events outline test.pdf';
      const PAGE_COUNT = 3;
      const OUTLINE_ITEM_TITLE = 'Chapter two';
      // PDF.js's `SidebarView.OUTLINE`.
      const OUTLINE_SIDEBAR_VIEW = 2;

      /**
       * Builds a PDF of plain-text pages with an outline whose items point at pages 2 and 3, with a cross-reference
       * table whose offsets are exact, so the viewer loads it with no repair.
       *
       * @param pageCount - How many pages.
       * @returns The PDF's bytes, all of them ASCII.
       */
      function buildPdf(pageCount: number): string {
        const FIRST_PAGE_OBJECT_ID = 4;
        const outlinesObjectId = FIRST_PAGE_OBJECT_ID + pageCount * 2;
        const objects = [
          `<< /Type /Catalog /Pages 2 0 R /Outlines ${String(outlinesObjectId)} 0 R >>`,
          '',
          '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
        ];
        const pageRefs: string[] = [];
        for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
          const pageObjectId = FIRST_PAGE_OBJECT_ID + pageIndex * 2;
          const stream = `BT /F1 48 Tf 100 600 Td (Page ${String(pageIndex + 1)}) Tj ET`;
          pageRefs.push(`${String(pageObjectId)} 0 R`);
          objects.push(
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${String(pageObjectId + 1)} 0 R >>`,
            `<< /Length ${String(stream.length)} >>\nstream\n${stream}\nendstream`
          );
        }
        objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${String(pageCount)} >>`;
        const firstItemId = outlinesObjectId + 1;
        const secondItemId = outlinesObjectId + 2;
        objects.push(
          `<< /Type /Outlines /First ${String(firstItemId)} 0 R /Last ${String(secondItemId)} 0 R /Count 2 >>`,
          `<< /Title (Chapter one) /Parent ${String(outlinesObjectId)} 0 R /Next ${String(secondItemId)} 0 R /Dest [${pageRefs[1] ?? ''} /Fit] >>`,
          `<< /Title (${OUTLINE_ITEM_TITLE}) /Parent ${String(outlinesObjectId)} 0 R /Prev ${String(firstItemId)} 0 R /Dest [${pageRefs[2] ?? ''} /Fit] >>`
        );

        let pdf = '%PDF-1.4\n';
        const offsets: number[] = [];
        for (const [index, body] of objects.entries()) {
          offsets.push(pdf.length);
          pdf += [`${String(index + 1)} 0 obj`, body, 'endobj', ''].join('\n');
        }
        const crossReferenceOffset = pdf.length;
        pdf += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n`;
        for (const offset of offsets) {
          pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
        }
        pdf += ['trailer', `<< /Size ${String(objects.length + 1)} /Root 1 0 R >>`, 'startxref', String(crossReferenceOffset), '%%EOF', ''].join('\n');
        return pdf;
      }

      const filePaths: string[] = [];
      const outlineItems: PdfOutlineMenuItem[] = [];
      const subjects: string[] = [];
      let shownMenu: Menu | null = null;

      const file = await app.vault.createBinary(PDF_PATH, new TextEncoder().encode(buildPdf(PAGE_COUNT)).buffer);
      const leaf = app.workspace.getLeaf('tab');

      const eventRef = app.workspace.on(pdfOutlineMenuEventName, (menu, pdfLeaf, outlineItem) => {
        shownMenu = menu;
        subjects.push(pdfLeaf.view.getViewType());
        filePaths.push(pdfLeaf.view.getState()['file'] as string);
        outlineItems.push(outlineItem);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      interface Point {
        readonly x: number;
        readonly y: number;
      }

      function centerOf(el: HTMLElement): Point {
        const rect = el.getBoundingClientRect();
        return {
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2)
        };
      }

      interface PdfView {
        readonly viewer?: PdfViewerComponent;
      }

      interface PdfViewerComponent {
        readonly child: null | PdfViewerChild;
      }

      interface PdfViewerChild {
        readonly pdfViewer: null | PdfJsViewer;
      }

      interface PdfJsViewer {
        readonly pdfSidebar?: PdfSidebar;
      }

      // PDF.js's own sidebar controller.
      interface PdfSidebar {
        readonly isOpen: boolean;
        readonly switchView: (view: number, shouldForceOpen: boolean) => void;
        readonly visibleView: number;
      }

      function getPdfSidebar(): PdfSidebar | undefined {
        // A cast through `unknown`, because the PDF view is described by no typings at all.
        const untypedView: unknown = leaf.view;
        return (untypedView as PdfView).viewer?.child?.pdfViewer?.pdfSidebar;
      }

      function findOutlineItemEl(): HTMLElement | null {
        const itemEls = leaf.view.containerEl.querySelectorAll<HTMLElement>(':scope .pdf-outline-view .tree-item-self');
        return [...itemEls].find((itemEl) => itemEl.textContent.includes(OUTLINE_ITEM_TITLE)) ?? null;
      }

      try {
        await leaf.openFile(file, { active: true });
        await app.workspace.revealLeaf(leaf);
        if (leaf.view.getViewType() !== 'pdf') {
          throw new Error(`Expected the PDF view, got ${leaf.view.getViewType()}`);
        }

        await waitUntil({
          message: 'the outline item to be shown',
          predicate: () => {
            // Asked again on every poll, because the outline view can be switched to only once the outline has loaded.
            const pdfSidebar = getPdfSidebar();
            if (pdfSidebar && (!pdfSidebar.isOpen || pdfSidebar.visibleView !== OUTLINE_SIDEBAR_VIEW)) {
              pdfSidebar.switchView(OUTLINE_SIDEBAR_VIEW, true);
            }
            const outlineItemEl = findOutlineItemEl();
            if (!outlineItemEl?.isShown()) {
              return false;
            }
            // The sidebar slides open after the view is shown, so a rect read too early points at whatever was there.
            const point = centerOf(outlineItemEl);
            return outlineItemEl.contains(activeDocument.elementFromPoint(point.x, point.y));
          },
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const outlineItemEl = findOutlineItemEl();
        if (!outlineItemEl) {
          throw new Error('The outline item is no longer shown.');
        }
        await clickMouse({
          button: 'right',
          ...centerOf(outlineItemEl)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          filePaths,
          outlineItems,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent),
          subjects
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        leaf.detach();
        await app.fileManager.trashFile(file);
      }
    },
    input: {
      PDF_OUTLINE_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
