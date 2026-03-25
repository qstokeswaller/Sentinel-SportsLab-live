import React from 'react';
import { Search } from 'lucide-react';

interface Props {
  suggestions: { name: string; score: number }[];
  onSelect: (name: string) => void;
}

export default function DidYouMeanBanner({ suggestions, onSelect }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm">
      <Search size={14} className="text-amber-600 shrink-0" />
      <span className="text-amber-800">
        Did you mean:{' '}
        {suggestions.map((s, i) => (
          <React.Fragment key={s.name}>
            {i > 0 && ', '}
            <button
              type="button"
              onClick={() => onSelect(s.name)}
              className="font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 cursor-pointer"
            >
              {s.name}
            </button>
          </React.Fragment>
        ))}
        ?
      </span>
    </div>
  );
}
