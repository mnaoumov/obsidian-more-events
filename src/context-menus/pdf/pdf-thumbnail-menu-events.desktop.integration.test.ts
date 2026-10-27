import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import { PDF_THUMBNAIL_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

interface MenuRecord {
  /**
   * The paths of the files open in the leaves the listener was given.
   */
  filePaths: string[];

  /**
   * The page numbers the listener was given.
   */
  pageNumbers: number[];

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
 * The test that can fail for the right reason: the claim is about the REAL app. The announcement rests on
 * `evt.currentTarget` still being the viewer's sidebar container while Obsidian shows a thumbnail's menu, and
 * on the PDF view reaching that element as `viewer.child.pdfViewer.dom.sidebarContainerEl`, which only a real
 * trusted right-click through the real listener proves.
 *
 * The PDF is written by the suite itself, three pages of plain text, so the vault needs no fixture file. It
 * right-clicks the thumbnail of page 2 rather than page 1, so a page number read from the wrong place fails.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`, and the thumbnail menu
 * itself is the same on mobile.
 */
describe('PDF thumbnail menu events', () => {
  it('should let a listener add an item to the menu of a page thumbnail', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickThumbnail();

    expect(record.subjects).toEqual(['pdf']);
    expect(record.filePaths).toEqual(['More Events thumbnail test.pdf']);
    expect(record.pageNumbers).toEqual([2]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Copy link to page 2');
  });
});

/**
 * Writes a three-page PDF, opens it, right-clicks the thumbnail of page 2 with a trusted click, and records
 * what the listener saw and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function rightClickThumbnail(): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      lib,
      PDF_THUMBNAIL_MENU_EVENT_NAME: pdfThumbnailMenuEventName
    }): Promise<MenuRecord> {
      const {
        clickMouse,
        waitUntil
      } = lib;
      // Two waits at 12 s declare 24 s in one transport call, under the 30 s a desktop closure gets.
      const WAIT_TIMEOUT_IN_MS = 12_000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const PDF_PATH = 'More Events thumbnail test.pdf';
      const PAGE_COUNT = 3;
      const PAGE_NUMBER = 2;

      /**
       * Builds a PDF of plain-text pages, with a cross-reference table whose offsets are exact, so the
       * viewer loads it with no repair.
       *
       * @param pageCount - How many pages.
       * @returns The PDF's bytes, all of them ASCII.
       */
      function buildPdf(pageCount: number): string {
        const FIRST_PAGE_OBJECT_ID = 4;
        const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
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
      const pageNumbers: number[] = [];
      const subjects: string[] = [];
      let shownMenu: Menu | null = null;

      const file = await app.vault.createBinary(PDF_PATH, new TextEncoder().encode(buildPdf(PAGE_COUNT)).buffer);
      const leaf = app.workspace.getLeaf('tab');

      const eventRef = app.workspace.on(pdfThumbnailMenuEventName, (menu, pdfLeaf, pageNumber) => {
        shownMenu = menu;
        subjects.push(pdfLeaf.view.getViewType());
        filePaths.push(pdfLeaf.view.getState()['file'] as string);
        pageNumbers.push(pageNumber);
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
        readonly open: () => void;
      }

      function getPdfSidebar(): PdfSidebar | undefined {
        // A cast through `unknown`, because the PDF view is described by no typings at all.
        const untypedView: unknown = leaf.view;
        return (untypedView as PdfView).viewer?.child?.pdfViewer?.pdfSidebar;
      }

      function findThumbnailEl(): HTMLElement | null {
        return leaf.view.containerEl.querySelector<HTMLElement>(`.thumbnail[data-page-number="${CSS.escape(String(PAGE_NUMBER))}"]`);
      }

      try {
        await leaf.openFile(file, { active: true });
        await app.workspace.revealLeaf(leaf);
        if (leaf.view.getViewType() !== 'pdf') {
          throw new Error(`Expected the PDF view, got ${leaf.view.getViewType()}`);
        }

        await waitUntil({
          message: 'the thumbnail of page 2 to be shown',
          predicate: () => {
            /*
             * The sidebar starts closed, translated off the view's left edge, where its thumbnails are rendered all
             * the same. One run that opened it once, before the document had loaded, saw it stay closed, so it is
             * asked again on every poll until it reports open.
             */
            const pdfSidebar = getPdfSidebar();
            if (pdfSidebar && !pdfSidebar.isOpen) {
              pdfSidebar.open();
            }
            const thumbnailEl = findThumbnailEl();
            if (!thumbnailEl?.isShown()) {
              return false;
            }
            // The sidebar slides open after the view is shown, so a rect read too early points at whatever was there.
            const point = centerOf(thumbnailEl);
            return thumbnailEl.contains(activeDocument.elementFromPoint(point.x, point.y));
          },
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const thumbnailEl = findThumbnailEl();
        if (!thumbnailEl) {
          throw new Error('The thumbnail is no longer shown.');
        }
        await clickMouse({
          button: 'right',
          ...centerOf(thumbnailEl)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          filePaths,
          pageNumbers,
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
      PDF_THUMBNAIL_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
