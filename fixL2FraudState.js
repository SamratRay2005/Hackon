const fs = require('fs');

let content = fs.readFileSync('src/app/layers/L2Fraud.tsx', 'utf8');

// Replace the end of useApp destructuring
content = content.replace(
  '    setInspectQueue,\n    isAdminMode,\n  } = useApp() as any;',
  '    setInspectQueue,\n    isAdminMode,\n    manualReviewQueue, setManualReviewQueue,\n    userDescription, setUserDescription,\n  } = useApp() as any;'
);

// Remove the local state declarations
content = content.replace('  const [userDescription, setUserDescription] = React.useState("");\n', '');
content = content.replace('  const [manualReviewQueue, setManualReviewQueue] = React.useState<any[]>([]);\n', '');

fs.writeFileSync('src/app/layers/L2Fraud.tsx', content);
