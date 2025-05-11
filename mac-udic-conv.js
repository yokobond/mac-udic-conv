const fs = require('fs');
const path = require('path');

// Get file names from command line arguments, with defaults
const inputFileName = process.argv[2] || 'dict.txt';
const outputFileName = process.argv[3] || 'dict.plist';

// Helper function to escape XML special characters
function escapeXml(unsafe) {
    if (typeof unsafe !== 'string') {
        return unsafe;
    }
    return unsafe.replace(/[<>&"']/g, function (match) {
        switch (match) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return match;
        }
    });
}

try {
    // Determine the directory of the script to locate input/output files
    const scriptDir = __dirname; 
    const inputFilePath = path.isAbsolute(inputFileName) ? inputFileName : path.join(scriptDir, inputFileName);
    const outputFilePath = path.isAbsolute(outputFileName) ? outputFileName : path.join(scriptDir, outputFileName);

    console.log(`Using input file: ${inputFilePath}`);
    console.log(`Using output file: ${outputFilePath}`);

    // 1. Read dict.txt (or specified input file)
    console.log(`Reading from: ${inputFilePath}`);
    const data = fs.readFileSync(inputFilePath, 'utf8');

    // 2. Parse content
    const lines = data.split(/\r?\n/); // Handles both LF and CRLF line endings
    const entries = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('!') || trimmedLine === '') {
            continue; // Skip comments and empty lines
        }

        const parts = trimmedLine.split('\t');
        if (parts.length >= 2) {
            const shortcut = parts[0].trim();
            const phrase = parts[1].trim();
            // The third part (e.g., "固有名詞") is ignored as per the plist example
            if (shortcut && phrase) { // Ensure both are non-empty after trim
                entries.push({ shortcut, phrase });
            } else {
                console.warn(`Skipping malformed line (empty shortcut or phrase): "${line}"`);
            }
        } else if (trimmedLine) { // Non-empty line that doesn't split into at least 2 parts
            console.warn(`Skipping malformed line (not enough parts): "${line}"`);
        }
    }

    if (entries.length === 0) {
        console.warn(`No valid entries found in ${path.basename(inputFilePath)}. Output will be an empty list.`);
    }

    // 3. Construct plist XML
    let plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array>\n`;

    for (const entry of entries) {
        plistContent += `	<dict>\n`;
        plistContent += `		<key>phrase</key>\n`;
        plistContent += `		<string>${escapeXml(entry.phrase)}</string>\n`;
        plistContent += `		<key>shortcut</key>\n`;
        plistContent += `		<string>${escapeXml(entry.shortcut)}</string>\n`;
        plistContent += `	</dict>\n`;
    }

    plistContent += `</array>\n`;
    plistContent += `</plist>\n`;

    // 4. Write to dict.plist (or specified output file)
    fs.writeFileSync(outputFilePath, plistContent, 'utf8');

    console.log(`Successfully converted ${path.basename(inputFilePath)} to ${path.basename(outputFilePath)}`);
    console.log(`Output written to: ${outputFilePath}`);
    console.log(`Number of words converted: ${entries.length}`);

} catch (error) {
    console.error('Error during conversion:');
    if (error.code === 'ENOENT' && error.path === inputFilePath) { // Check if error is specifically for input file
         console.error(`Input file '${path.basename(inputFilePath)}' not found at '${inputFilePath}'.`);
         console.error(`Please make sure the file exists or check the path.`);
    } else if (error.code === 'ENOENT' && error.path) { // Generic ENOENT
        console.error(`File or directory not found: ${error.path}`);
    } else {
        console.error(error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    }
    process.exitCode = 1; // Indicate an error occurred
}
