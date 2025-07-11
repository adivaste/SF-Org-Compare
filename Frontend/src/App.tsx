import { useState, useEffect } from 'react';
import Split from 'react-split';
import ThemeToggle from './components/ThemeToggle';
import FileTree from './components/FileTree';
import DiffEditor from './components/DiffEditor';
import SettingsPanel from './components/SettingsPanel';
import { cn } from './utils/styles';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}

// Sample data structure for testing
const sampleData: FileNode = {
  name: 'root',
  type: 'directory',
  path: '/',
  children: [
    {
      name: 'src',
      type: 'directory',
      path: '/src',
      children: [
        {
          name: 'components',
          type: 'directory',
          path: '/src/components',
          children: [
            {
              name: 'App.tsx',
              type: 'file',
              path: '/src/components/App.tsx',
            },
            {
              name: 'Button.tsx',
              type: 'file',
              path: '/src/components/Button.tsx',
            },
          ],
        },
        {
          name: 'index.tsx',
          type: 'file',
          path: '/src/index.tsx',
        },
      ],
    },
    {
      name: 'package.json',
      type: 'file',
      path: '/package.json',
    },
  ],
};

const sampleOriginalCode = `
// ContactService.cls - Original Version
// This class provides basic operations for Contact records.

public class ContactService {

    /**
     * Creates a new Contact record.
     * @param firstName The first name of the contact.
     * @param lastName The last name of the contact.
     * @param email The email of the contact.
     * @param accountId The ID of the parent Account.
     * @return The newly created Contact record.
     */
    public static Contact createContact(String firstName, String lastName, String email, Id accountId) {
        Contact newCon = new Contact(
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            AccountId = accountId
        );
        insert newCon;
        return newCon;
    }

    // End of class
}
`;

const sampleModifiedCode = `
// ContactService.cls - Modified Version
// This class provides advanced operations for Contact records.
// Includes creation, update, and basic validation.

public class ContactService {

    /**
     * Creates a new Contact record with improved validation.
     * Ensures required fields are present.
     * @param firstName The first name of the contact.
     * @param lastName The last name of the contact.
     * @param email The email of the contact.
     * @param accountId The ID of the parent Account.
     * @return The newly created Contact record, or null if creation fails.
     */
    public static Contact createContact(String firstName, String lastName, String email, Id accountId) {
        if (String.isBlank(firstName) || String.isBlank(lastName)) {
            System.debug('Error: First Name and Last Name are required.');
            return null; // Do not proceed if names are blank
        }

        Contact newCon = new Contact(
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            AccountId = accountId,
            Phone = '555-123-4567' // Adding a default phone number
        );
        // Attempt to insert the contact
        try {
            insert newCon;
            System.debug('Successfully created Contact: ' + newCon.Id);
            return newCon;
        } catch (DmlException e) {
            System.debug('Error creating Contact: ' + e.getMessage());
            return null; // Return null on DML error
        }
    }

    /**
     * Updates the email of an existing Contact record.
     * @param contactId The ID of the Contact to update.
     * @param newEmail The new email address.
     * @return True if update was successful, false otherwise.
     */
    public static Boolean updateContactEmail(Id contactId, String newEmail) {
        if (contactId == null || String.isBlank(newEmail)) {
            System.debug('Error: Contact ID and new Email are required for update.');
            return false;
        }

        Contact existingContact = [SELECT Id, Email FROM Contact WHERE Id = :contactId LIMIT 1];

        if (existingContact != null) {
            existingContact.Email = newEmail;
            try {
                update existingContact;
                System.debug('Contact email updated for ID: ' + contactId);
                return true;
            } catch (DmlException e) {
                System.debug('Error updating Contact email: ' + e.getMessage());
                return false;
            }
        } else {
            System.debug('Contact not found with ID: ' + contactId);
            return false;
        }
    }
}
}`;

function App() {
  const [selectedFile, setSelectedFile] = useState<string | undefined>();
  const [settings, setSettings] = useState({
    fontSize: 14,
    renderSideBySide: true,
    showDiffOnly: false,
    extraLines: 3,
  });

  useEffect(() => {
    // Check system theme preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Code Diff Checker
          </h1>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {selectedFile || 'No file selected'}
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Settings Panel */}
      <SettingsPanel settings={settings} onSettingChange={handleSettingChange} />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <Split
            sizes={[20, 80]}
            minSize={200}
            expandToMin={false}
            gutterSize={4}
            gutterAlign="center"
            snapOffset={30}
            dragInterval={1}
            direction="horizontal"
            cursor="col-resize"
            className="split h-full"
          >
            {/* File Tree */}
            <div className="h-full">
              <FileTree
                data={[sampleData]}
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile}
              />
            </div>

            {/* Diff Editor */}
            <div className="h-full border-l border-gray-200 dark:border-gray-700">
              <DiffEditor
                originalCode={sampleOriginalCode}
                modifiedCode={sampleModifiedCode}
                options={{
                  fontSize: settings.fontSize,
                  renderSideBySide: settings.renderSideBySide,
                  showDiffOnly: settings.showDiffOnly,
                  extraLines: settings.extraLines,
                }}
              />
            </div>
          </Split>
        </div>
      </div>
    </div>
  );
}

export default App;
