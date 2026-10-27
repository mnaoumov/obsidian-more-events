import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import {
  PDF_DISPLAY_MENU_EVENT_NAME,
  PDF_SIDEBAR_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';

interface MenuRecord {
  readonly filePaths: string[];
  readonly leafMatches: boolean[];
  readonly otherEventCount: number;
  readonly shownItemTitles: string[];
}

// Trusted clicks prove both anchor identities against the real PDF toolbar, and that listeners can add items.
describe('PDF toolbar menu events', () => {
  it.each(
    [
      ['sidebar', 'Thumbnails'],
      ['display', 'Fit width']
    ] as const
  )('should let a listener extend the PDF %s options menu', { timeout: 120_000 }, async (kind, nativeTitle) => {
    const record = await clickToolbar(kind);
    expect(record.leafMatches).toEqual([true]);
    expect(record.filePaths).toEqual([`More Events ${kind} toolbar test.pdf`]);
    expect(record.otherEventCount).toBe(0);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain(nativeTitle);
  });
});

async function clickToolbar(kind: 'display' | 'sidebar'): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({ app, kind: menuKind, lib, PDF_DISPLAY_MENU_EVENT_NAME: displayEvent, PDF_SIDEBAR_MENU_EVENT_NAME: sidebarEvent }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
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

      const file = await app.vault.createBinary(`More Events ${menuKind} toolbar test.pdf`, new TextEncoder().encode(buildPdf(3)).buffer);
      // An unrelated PDF leaf must never be reported instead of the one whose toolbar was clicked.
      const otherLeaf = app.workspace.getLeaf('tab');
      const leaf = app.workspace.getLeaf('tab');
      const leafMatches: boolean[] = [];
      const filePaths: string[] = [];
      let otherEventCount = 0;
      let shownMenu: Menu | null = null;
      const eventName = menuKind === 'sidebar' ? sidebarEvent : displayEvent;
      const otherEventName = menuKind === 'sidebar' ? displayEvent : sidebarEvent;
      const eventRef = app.workspace.on(eventName, (menu, pdfLeaf) => {
        shownMenu = menu;
        leafMatches.push(pdfLeaf === leaf);
        filePaths.push(pdfLeaf.view.getState()['file'] as string);
        menu.addItem((item) => item.setTitle('Added by a listener'));
      });
      const otherRef = app.workspace.on(otherEventName, () => {
        otherEventCount++;
      });
      interface PdfView {
        readonly viewer?: PdfViewerComponent;
      }
      interface PdfViewerComponent {
        readonly child: null | PdfViewerChild;
      }
      interface PdfViewerChild {
        readonly toolbar?: PdfToolbar;
      }
      interface PdfToolbar {
        readonly sidebarOptionsEl: HTMLElement;
        readonly zoomInEl: HTMLElement;
      }
      function findButton(): HTMLElement | null | undefined {
        const view: unknown = leaf.view;
        const toolbar = (view as PdfView).viewer?.child?.toolbar;
        return menuKind === 'sidebar' ? toolbar?.sidebarOptionsEl : toolbar?.zoomInEl.nextElementSibling as HTMLElement | null | undefined;
      }
      try {
        await otherLeaf.openFile(file);
        await leaf.openFile(file, { active: true });
        await app.workspace.revealLeaf(leaf);
        await waitUntil({
          message: 'the PDF toolbar button to be visible',
          predicate: () => !!findButton()?.isShown(),
          timeoutInMilliseconds: 12_000
        });
        const button = findButton();
        if (!button) {
          throw new Error('The PDF toolbar button disappeared');
        }
        const rect = button.getBoundingClientRect();
        await clickMouse({ x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) });
        await waitUntil({
          message: 'the PDF toolbar menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: 12_000
        });
        return {
          filePaths,
          leafMatches,
          otherEventCount,
          shownItemTitles: Array.from(activeDocument.body.querySelectorAll(':scope .menu .menu-item-title'), (el) => el.textContent)
        };
      } finally {
        app.workspace.offref(eventRef);
        app.workspace.offref(otherRef);
        (shownMenu as Menu | null)?.hide();
        // Escape closes the native menu even when an unplugged announcer gave no listener its Menu instance.
        await lib.pressKey({ key: 'Escape' });
        leaf.detach();
        otherLeaf.detach();
        await app.fileManager.trashFile(file);
      }
    },
    input: { kind, PDF_DISPLAY_MENU_EVENT_NAME, PDF_SIDEBAR_MENU_EVENT_NAME },
    vaultPath: getTemporaryVault().path
  });
}
