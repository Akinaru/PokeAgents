import { Button } from './ui/Button.js';

interface MigrationNoticeProps {
  onDismiss: () => void;
}

export function MigrationNotice({ onDismiss }: MigrationNoticeProps) {
  return (
    <div
      className="absolute inset-0 bg-black/70 flex items-center justify-center z-100"
      onClick={onDismiss}
    >
      <div
        className="pixel-panel py-24 px-32 max-w-xl text-center leading-[1.3]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-12 text-accent">Welcome to Route 1!</div>
        <p className="text-xl m-0 mb-12">
          A new map is out, so your previous layout was replaced by the bundled one.
        </p>
        <p className="text-xl m-0 mb-20">
          Every agent is now a wild Pokémon. It evolves as its context fills up, and a lucky few are
          shiny.
        </p>
        <Button variant="accent" size="xl" onClick={onDismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
