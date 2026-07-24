import React from 'react';
import { Tag } from '../types';

interface TagBadgeProps {
  tagCode?: string;
  categoryName?: string;
  tags?: Tag[];
  color?: string;
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tagCode,
  categoryName,
  tags,
  color,
  className,
}) => {
  const nameOrCode = categoryName || tagCode;
  if (!nameOrCode) return null;

  const foundTag = tags?.find(
    (t) =>
      t.name.toLowerCase() === nameOrCode.toLowerCase() ||
      (t.code && t.code.toLowerCase() === nameOrCode.toLowerCase())
  );

  const displayName = foundTag?.name || nameOrCode;
  const hexColor = color || foundTag?.color || '#2563eb';

  return (
    <span
      style={{
        backgroundColor: `${hexColor}15`,
        color: hexColor,
        borderColor: `${hexColor}35`,
      }}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 transition-all ${className || ''}`}
    >
      <span
        style={{ backgroundColor: hexColor }}
        className="w-1.5 h-1.5 rounded-full shrink-0"
      />
      <span className="truncate max-w-[140px]">{displayName}</span>
    </span>
  );
};
