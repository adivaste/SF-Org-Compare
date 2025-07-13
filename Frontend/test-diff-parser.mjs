import { DiffParser, getFile, diffChanges, getSplitLines, getUnifiedLines } from '@git-diff-view/core';

// Test unified diff string
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

console.log('=== Testing @git-diff-view/core ===');

// Test 1: DiffParser
console.log('\n1. Testing DiffParser:');
const parser = new DiffParser();
try {
  const result = parser.parse(diffString);
  console.log('Parse result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.log('Parse error:', error.message);
}

// Test 2: getFile function
console.log('\n2. Testing getFile:');
try {
  const file = getFile('oldFile', 'import React from "react";\n\nfunction SimpleComponent() {\n  return (\n    <div>\n      <h1>Hello World</h1>\n    </div>\n  );\n}\n\nexport default SimpleComponent;', 'newFile', 'import React from "react";\nimport { useState } from "react";\n\nfunction SimpleComponent() {\n  const [count, setCount] = useState(0);\n  \n  return (\n    <div>\n      <h1>Hello World</h1>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n    </div>\n  );\n}\n\nexport default SimpleComponent;', 'javascript', 'javascript');
  console.log('getFile result:', file);
  console.log('File hunks:', file.hunks);
  console.log('File lines:', file.lines);
} catch (error) {
  console.log('getFile error:', error.message);
}

// Test 3: diffChanges function
console.log('\n3. Testing diffChanges:');
try {
  const original = `import React from 'react';

function SimpleComponent() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
}

export default SimpleComponent;`;

  const modified = `import React from 'react';
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

export default SimpleComponent;`;

  const changes = diffChanges(original, modified);
  console.log('diffChanges result:', changes);
} catch (error) {
  console.log('diffChanges error:', error.message);
}

// Test 4: getSplitLines
console.log('\n4. Testing getSplitLines:');
try {
  const splitLines = getSplitLines(diffString);
  console.log('Split lines:', splitLines);
} catch (error) {
  console.log('getSplitLines error:', error.message);
}

// Test 5: getUnifiedLines
console.log('\n5. Testing getUnifiedLines:');
try {
  const unifiedLines = getUnifiedLines(diffString);
  console.log('Unified lines:', unifiedLines);
} catch (error) {
  console.log('getUnifiedLines error:', error.message);
}

// Check if there are any other relevant functions
console.log('\n6. Looking for unified diff related functions:');
import * as core from '@git-diff-view/core';
Object.keys(core).forEach(key => {
  if (typeof core[key] === 'function' && (key.toLowerCase().includes('unified') || key.toLowerCase().includes('diff') || key.toLowerCase().includes('parse'))) {
    console.log(`- ${key}: function`);
  }
}); 