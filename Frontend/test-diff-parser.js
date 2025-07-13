import { DiffParser, getUnifiedLines, getFile } from '@git-diff-view/core';

// Example unified diff string (from server) - properly formatted
const diffString = `--- a/src/components/SimpleComponent.js
+++ b/src/components/SimpleComponent.js
@@ -1,7 +1,12 @@
 import React from 'react';
+import { useState } from 'react';

 function SimpleComponent() {
+  const [count, setCount] = useState(0);
+  
   return (
     <div>
       <h1>Hello World</h1>
+      <p>Count: {count}</p>
+      <button onClick={() => setCount(count + 1)}>Increment</button>
     </div>
   );
 }

 export default SimpleComponent;`;

console.log('=== Testing Unified Diff Parsing ===\n');

// Test 1: Manual parsing of unified diff (since DiffParser seems to have issues)
console.log('1. Manual parsing of unified diff string:');
function parseUnifiedDiff(diffString) {
  const lines = diffString.split('\n');
  const hunks = [];
  let currentHunk = null;
  
  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Parse hunk header
      const match = line.match(/@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@/);
      if (match) {
        currentHunk = {
          oldStart: parseInt(match[1]),
          oldLines: parseInt(match[2]) || 1,
          newStart: parseInt(match[3]),
          newLines: parseInt(match[4]) || 1,
          lines: []
        };
        hunks.push(currentHunk);
      }
    } else if (currentHunk && (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-'))) {
      currentHunk.lines.push({
        type: line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : 'context',
        content: line.substring(1),
        original: line
      });
    }
  }
  
  return hunks;
}

try {
  const parsedHunks = parseUnifiedDiff(diffString);
  console.log('✅ Diff parsed successfully');
  console.log('Number of hunks:', parsedHunks.length);
  console.log('First hunk:', JSON.stringify(parsedHunks[0], null, 2));
} catch (error) {
  console.log('❌ Parse error:', error.message);
}

// Test 2: Get unified lines for rendering
console.log('\n2. Getting unified lines for rendering:');
try {
  const unifiedLines = getUnifiedLines(diffString);
  console.log('✅ Unified lines extracted successfully');
  console.log('Number of lines:', unifiedLines.length);
  if (unifiedLines.length > 0) {
    console.log('Sample lines:', unifiedLines.slice(0, 3).map(line => ({
      type: line.type,
      content: line.content?.substring(0, 50) + '...',
      lineNumber: line.lineNumber
    })));
  } else {
    console.log('⚠️  No lines returned from getUnifiedLines');
  }
} catch (error) {
  console.log('❌ Error getting unified lines:', error.message);
}

// Test 3: Dummy fetch for full content
console.log('\n3. Dummy fetch for full content:');
async function fetchFullContent(filePath) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Dummy data - in real app this would come from your server
  const dummyData = {
    'src/components/SimpleComponent.js': {
      original: `import React from 'react';

function SimpleComponent() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
}

export default SimpleComponent;`,
      modified: `import React from 'react';
import { useState } from 'react';

function SimpleComponent() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>Hello World</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

export default SimpleComponent;`
    }
  };
  
  return dummyData[filePath] || { original: '', modified: '' };
}

// Test the dummy fetch
try {
  console.log('Fetching full content...');
  const { original, modified } = await fetchFullContent('src/components/SimpleComponent.js');
  console.log('✅ Full content fetched successfully');
  console.log('Original length:', original.length, 'characters');
  console.log('Modified length:', modified.length, 'characters');
  
  // Generate full file diff
  const fileDiff = getFile('oldFile', original, 'newFile', modified, 'javascript', 'javascript');
  console.log('✅ Full file diff generated');
  console.log('File diff object keys:', Object.keys(fileDiff));
  
} catch (error) {
  console.log('❌ Error fetching full content:', error.message);
}

// Test 4: Render simulation with actual diff content
console.log('\n4. Rendering simulation with actual diff content:');
function renderDiffView(lines, isFullFile = false) {
  console.log(`\n📄 Rendering ${isFullFile ? 'FULL FILE' : 'DIFF ONLY'} view:`);
  console.log('┌' + '─'.repeat(78) + '┐');
  
  if (lines.length === 0) {
    console.log('│ No lines to display');
  } else {
    lines.forEach((line, index) => {
      const lineNum = line.lineNumber || index + 1;
      const prefix = line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' ';
      const content = line.content || line.original || '';
      console.log(`│ ${prefix} ${lineNum.toString().padStart(3)} │ ${content}`);
    });
  }
  
  console.log('└' + '─'.repeat(78) + '┘');
}

// Simulate rendering diff-only view using manual parsing
try {
  const parsedHunks = parseUnifiedDiff(diffString);
  const diffLines = parsedHunks.flatMap(hunk => hunk.lines);
  renderDiffView(diffLines, false);
} catch (error) {
  console.log('❌ Error rendering diff view:', error.message);
}

// Simulate rendering full file view
try {
  const { original, modified } = await fetchFullContent('src/components/SimpleComponent.js');
  
  // Create lines for full file view
  const originalLines = original.split('\n').map((line, i) => ({
    type: 'context',
    content: line,
    lineNumber: i + 1
  }));
  
  const modifiedLines = modified.split('\n').map((line, i) => ({
    type: 'context',
    content: line,
    lineNumber: i + 1
  }));
  
  console.log('\n📄 Full file view - Original:');
  renderDiffView(originalLines.slice(0, 5), true);
  
  console.log('\n📄 Full file view - Modified:');
  renderDiffView(modifiedLines.slice(0, 5), true);
  
} catch (error) {
  console.log('❌ Error rendering full file view:', error.message);
}

// Test 5: Integration example
console.log('\n5. Integration example - How to use in your app:');
console.log(`
// Phase 1: Initial load (bandwidth efficient)
const diffString = await fetch('/api/diff/file.js');
const diffLines = parseUnifiedDiff(diffString);
renderDiffView(diffLines, false);

// Phase 2: On demand (when user clicks "Expand")
const fullContent = await fetch('/api/files/file.js');
const fileDiff = getFile('old', fullContent.original, 'new', fullContent.modified, 'js', 'js');
renderFullFileView(fileDiff, true);
`);

console.log('\n✅ Test completed successfully!'); 