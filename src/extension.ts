import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('markdown-table.deleteColumn', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No editor is active');
            return;
        }

        const document = editor.document;
        const cursorPosition = editor.selection.active;
        const cursorLine = cursorPosition.line;
        const cursorChar = cursorPosition.character;

        const lines = document.getText().split('\n');

        // Step 1: Find table bounds
        let tableStart = cursorLine;
        while (tableStart > 0 && lines[tableStart - 1].includes('|')) {
            tableStart--;
        }

        let tableEnd = cursorLine;
        while (tableEnd < lines.length - 1 && lines[tableEnd + 1].includes('|')) {
            tableEnd++;
        }

        const tableLines = lines.slice(tableStart, tableEnd + 1);

        // Step 2: Find column index based on cursor position in header row
        const headerLine = lines[cursorLine];
        const headerCellsRaw = headerLine.split('|');
        const headerCells = headerCellsRaw.slice(1, -1);

        let columnIndex = -1;
        let cumulativeLength = 1; // Leading '|'

        for (let i = 0; i < headerCells.length; i++) {
            cumulativeLength += headerCells[i].length + 1; // cell content + '|'
            if (cursorChar < cumulativeLength) {
                columnIndex = i;
                break;
            }
        }

        if (columnIndex === -1) {
            vscode.window.showInformationMessage('Unable to determine column index');
            return;
        }

        // Step 3: Parse and modify only this table
        const tableCells: string[][] = tableLines.map(line => {
            const rawCells = line.split('|');
            return rawCells.slice(1, -1).map(cell => cell.trim());
        });

        tableCells.forEach(row => {
            if (columnIndex < row.length) {
                row.splice(columnIndex, 1);
            }
        });

        // Step 4: Rebuild only this table
        const numCols = Math.max(...tableCells.map(row => row.length));
        const colWidths = new Array(numCols).fill(0);
        tableCells.forEach(row => {
            row.forEach((cell, colIdx) => {
                colWidths[colIdx] = Math.max(colWidths[colIdx], cell.length);
            });
        });

        const updatedTableLines = tableCells.map(row => {
            const padded = row.map((cell, i) => ' ' + cell.padEnd(colWidths[i]) + ' ');
            return '|' + padded.join('|') + '|';
        });

        // Step 5: Replace only the table in the document
        const range = new vscode.Range(
            new vscode.Position(tableStart, 0),
            new vscode.Position(tableEnd, lines[tableEnd].length)
        );

        await editor.edit(editBuilder => {
            editBuilder.replace(range, updatedTableLines.join('\n'));
        });

        vscode.window.showInformationMessage('Column deleted from current table only');
    }); // <== This closes the command registration block

    context.subscriptions.push(disposable);
} // <== This closes the activate() function

export function deactivate() {}
