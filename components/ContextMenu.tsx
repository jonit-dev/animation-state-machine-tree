import React, { useEffect, useRef, useState } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  children: React.ReactNode;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Animate in on mount
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);


  const handleClose = () => {
    setIsVisible(false);
  };
  
  const handleTransitionEnd = () => {
      if (!isVisible) {
          onClose();
      }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if(event.key === 'Escape') {
            handleClose();
        }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const style = {
    top: y,
    left: x,
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className={`absolute bg-slate-800/70 backdrop-blur-sm border border-slate-700 rounded-md shadow-lg py-1 z-50 origin-top-left transition-all duration-150 ease-out ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      onTransitionEnd={handleTransitionEnd}
    >
      {children}
    </div>
  );
};