import { useEffect, useRef, useState } from 'react';

import type { WorkspaceFolder } from '../hooks/useExtensionMessages.js';
import { isBrowserRuntime } from '../runtime.js';
import { transport } from '../transport/index.js';
import { Dropdown, DropdownItem } from './ui/Dropdown.js';

interface BottomToolbarProps {
  isEditMode: boolean;
  onOpenClaude: () => void;
  onToggleEditMode: () => void;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  isPartyOpen: boolean;
  onToggleParty: () => void;
  isPokedexOpen: boolean;
  onTogglePokedex: () => void;
  workspaceFolders: WorkspaceFolder[];
}

export function BottomToolbar({
  isEditMode,
  onOpenClaude,
  onToggleEditMode,
  isSettingsOpen,
  onToggleSettings,
  isPartyOpen,
  onToggleParty,
  isPokedexOpen,
  onTogglePokedex,
  workspaceFolders,
}: BottomToolbarProps) {
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isBypassMenuOpen, setIsBypassMenuOpen] = useState(false);
  const folderPickerRef = useRef<HTMLDivElement>(null);
  const pendingBypassRef = useRef(false);
  // Close folder picker / bypass menu on outside click
  useEffect(() => {
    if (!isFolderPickerOpen && !isBypassMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (folderPickerRef.current && !folderPickerRef.current.contains(e.target as Node)) {
        setIsFolderPickerOpen(false);
        setIsBypassMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isFolderPickerOpen, isBypassMenuOpen]);

  const hasMultipleFolders = workspaceFolders.length > 1;

  const handleAgentClick = () => {
    setIsBypassMenuOpen(false);
    pendingBypassRef.current = false;
    if (hasMultipleFolders) {
      setIsFolderPickerOpen((v) => !v);
    } else {
      onOpenClaude();
    }
  };

  const handleAgentHover = () => {
    if (!isFolderPickerOpen) {
      setIsBypassMenuOpen(true);
    }
  };

  const handleAgentLeave = () => {
    if (!isFolderPickerOpen) {
      setIsBypassMenuOpen(false);
    }
  };

  const handleFolderSelect = (folder: WorkspaceFolder) => {
    setIsFolderPickerOpen(false);
    const bypassPermissions = pendingBypassRef.current;
    pendingBypassRef.current = false;
    transport.send({ type: 'launchAgent', folderPath: folder.path, bypassPermissions });
  };

  const handleBypassSelect = (bypassPermissions: boolean) => {
    setIsBypassMenuOpen(false);
    if (hasMultipleFolders) {
      pendingBypassRef.current = bypassPermissions;
      setIsFolderPickerOpen(true);
    } else {
      transport.send({ type: 'launchAgent', bypassPermissions });
    }
  };

  return (
    <div className="absolute bottom-10 left-10 z-20 flex items-end gap-6 bw bw-menu">
      {/* Hide + Agent in standalone browser mode (no terminal to interact with) */}
      {!isBrowserRuntime && (
        <div
          ref={folderPickerRef}
          className="relative flex flex-col items-center"
          onMouseEnter={handleAgentHover}
          onMouseLeave={handleAgentLeave}
        >
          <button
            className="bw-ball"
            onClick={handleAgentClick}
            title="Lancer un agent"
            aria-label="+ Agent"
          />
          <Dropdown isOpen={isBypassMenuOpen}>
            <DropdownItem onClick={() => handleBypassSelect(true)}>
              Skip permissions mode <span className="text-2xs text-warning">⚠</span>
            </DropdownItem>
          </Dropdown>
          <Dropdown isOpen={isFolderPickerOpen} className="min-w-128">
            {workspaceFolders.map((folder) => (
              <DropdownItem
                key={folder.path}
                onClick={() => handleFolderSelect(folder)}
                className="text-base"
              >
                {folder.name}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
      )}
      <MenuButton label="ÉQUIPE" tone="yellow" active={isPartyOpen} onClick={onToggleParty} />
      <MenuButton
        label="CARTE"
        tone="blue"
        active={isEditMode}
        onClick={onToggleEditMode}
        title="Edit office layout"
      />
      <MenuButton
        label="POKéDEX"
        tone="green"
        active={isPokedexOpen}
        onClick={onTogglePokedex}
        title="Pokédex"
      />
      <MenuButton
        label="OPTIONS"
        tone="white"
        active={isSettingsOpen}
        onClick={onToggleSettings}
        title="Settings"
      />
    </div>
  );
}

/** One octagonal touch-screen button of the Black/White battle menu. */
function MenuButton({
  label,
  tone,
  active,
  onClick,
  title,
}: {
  label: string;
  /** Label color, as in the battle menu (BAG yellow, RUN blue, POKéMON green). */
  tone: 'yellow' | 'blue' | 'green' | 'white';
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      className={`bw-btn ${tone} ${active ? 'active' : ''}`}
      style={{ minWidth: 108, height: 46, fontSize: 17 }}
      onClick={onClick}
      title={title ?? label}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
