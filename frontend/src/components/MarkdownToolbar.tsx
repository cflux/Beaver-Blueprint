import { useRef, useCallback, useEffect } from 'react';
import { uploadImage } from '../api/images';

interface ToolbarAction {
  label: string;
  icon: string;
  prefix: string;
  suffix?: string;
  block?: boolean;
}

const actions: ToolbarAction[] = [
  { label: 'Bold', icon: 'B', prefix: '**', suffix: '**' },
  { label: 'Italic', icon: 'I', prefix: '_', suffix: '_' },
  { label: 'Strikethrough', icon: 'S', prefix: '~~', suffix: '~~' },
  { label: 'Code', icon: '<>', prefix: '`', suffix: '`' },
  { label: 'Link', icon: '\u{1F517}', prefix: '[', suffix: '](url)' },
  { label: 'Heading 1', icon: 'H1', prefix: '# ', block: true },
  { label: 'Heading 2', icon: 'H2', prefix: '## ', block: true },
  { label: 'Heading 3', icon: 'H3', prefix: '### ', block: true },
  { label: 'Bullet List', icon: '\u2022', prefix: '- ', block: true },
  { label: 'Numbered List', icon: '1.', prefix: '1. ', block: true },
  { label: 'Task List', icon: '\u2610', prefix: '- [ ] ', block: true },
  { label: 'Quote', icon: '\u275D', prefix: '> ', block: true },
  { label: 'Code Block', icon: '{ }', prefix: '```\n', suffix: '\n```', block: true },
  { label: 'Horizontal Rule', icon: '\u2014', prefix: '\n---\n', block: true },
];

function insertMarkdownAtCursor(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  text: string,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const newValue = value.substring(0, start) + text + value.substring(end);
  onChange(newValue);
  const cursorPos = start + text.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursorPos, cursorPos);
  });
}

async function handleImageFile(
  file: File,
  textarea: HTMLTextAreaElement,
  valueRef: { current: string },
  onChange: (v: string) => void,
) {
  const placeholder = `![Uploading ${file.name}...]()`;
  insertMarkdownAtCursor(textarea, valueRef.current, onChange, placeholder);

  try {
    const { url } = await uploadImage(file);
    // Replace placeholder with actual image markdown using latest value from ref
    onChange(valueRef.current.replace(placeholder, `![${file.name}](${url})`));
  } catch {
    onChange(valueRef.current.replace(placeholder, `![Upload failed: ${file.name}]()`));
  }
}

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

export function useImageUpload(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (value: string) => void,
) {
  // Use a ref to always have the latest value without re-attaching listeners
  const valueRef = useRef(value);
  valueRef.current = value;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    function getImageFromDataTransfer(dt: DataTransfer): File | null {
      for (const item of Array.from(dt.items)) {
        if (item.type.startsWith('image/')) {
          return item.getAsFile();
        }
      }
      return null;
    }

    function handlePaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      const file = getImageFromDataTransfer(e.clipboardData);
      if (file) {
        e.preventDefault();
        handleImageFile(file, ta!, valueRef, onChangeRef.current);
      }
    }

    function handleDragOver(e: DragEvent) {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    }

    function handleDrop(e: DragEvent) {
      if (!e.dataTransfer) return;
      const file = getImageFromDataTransfer(e.dataTransfer);
      if (file) {
        e.preventDefault();
        handleImageFile(file, ta!, valueRef, onChangeRef.current);
      }
    }

    ta.addEventListener('paste', handlePaste);
    ta.addEventListener('dragover', handleDragOver);
    ta.addEventListener('drop', handleDrop);
    return () => {
      ta.removeEventListener('paste', handlePaste);
      ta.removeEventListener('dragover', handleDragOver);
      ta.removeEventListener('drop', handleDrop);
    };
  }, [textareaRef]);
}

export function MarkdownToolbar({ textareaRef, value, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Attach paste/drop handlers
  useImageUpload(textareaRef, value, onChange);

  const applyAction = useCallback((action: ToolbarAction) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end);
    const prefix = action.prefix;
    const suffix = action.suffix ?? '';

    let insertion: string;
    let cursorPos: number;

    if (action.block && start > 0 && value[start - 1] !== '\n') {
      // Ensure block-level items start on a new line
      const newlinePrefix = '\n' + prefix;
      if (selected) {
        insertion = newlinePrefix + selected + suffix;
        cursorPos = start + insertion.length;
      } else {
        const placeholder = action.label;
        insertion = newlinePrefix + placeholder + suffix;
        cursorPos = start + newlinePrefix.length + placeholder.length;
      }
    } else if (selected) {
      insertion = prefix + selected + suffix;
      cursorPos = start + insertion.length;
    } else {
      const placeholder = action.label;
      insertion = prefix + placeholder + suffix;
      // Select the placeholder text for easy replacement
      cursorPos = start + prefix.length;
    }

    const newValue = value.substring(0, start) + insertion + value.substring(end);
    onChange(newValue);

    // Restore focus and set cursor position
    requestAnimationFrame(() => {
      ta.focus();
      if (selected) {
        ta.setSelectionRange(cursorPos, cursorPos);
      } else {
        const selectEnd = cursorPos + (action.block && start > 0 && value[start - 1] !== '\n'
          ? action.label.length
          : (selected || action.label).length);
        ta.setSelectionRange(cursorPos, selectEnd);
      }
    });
  }, [textareaRef, value, onChange]);

  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !textareaRef.current) return;
    handleImageFile(file, textareaRef.current, valueRef, onChange);
    // Reset so the same file can be selected again
    e.target.value = '';
  }, [textareaRef, value, onChange]);

  // Group: inline | headings | lists | blocks
  const inlineActions = actions.slice(0, 5);
  const headingActions = actions.slice(5, 8);
  const listActions = actions.slice(8, 11);
  const blockActions = actions.slice(11);

  const renderGroup = (group: ToolbarAction[]) => (
    <div className="flex items-center gap-0.5">
      {group.map((action) => (
        <div key={action.label} className="relative group/tip">
          <button
            type="button"
            onClick={() => applyAction(action)}
            className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors min-w-[28px]"
          >
            {action.icon}
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 text-xs text-white bg-gray-800 dark:bg-gray-950 rounded shadow-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity z-10">
            {action.label}
            <span className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-800 dark:bg-gray-950 rotate-45" />
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-700/50 border border-b-0 border-gray-200 dark:border-gray-700 rounded-t-xl flex-wrap">
      {renderGroup(inlineActions)}
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
      {renderGroup(headingActions)}
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
      {renderGroup(listActions)}
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
      {renderGroup(blockActions)}
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
      <div className="relative group/tip">
        <button
          type="button"
          onClick={handleImageClick}
          className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors min-w-[28px]"
        >
          {'\u{1F5BC}'}
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 text-xs text-white bg-gray-800 dark:bg-gray-950 rounded shadow-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity z-10">
          Image
          <span className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-800 dark:bg-gray-950 rotate-45" />
        </span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
