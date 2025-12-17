import React from 'react';
import ArrowIcon from './icons/ArrowIcon';

interface DirectionalPadProps {
  selectedDirection: string | null;
  onSelectDirection: (direction: string) => void;
}

const directions = [
    { label: 'facing opposite', rotation: 'rotate-0', position: 'col-start-2 row-start-1' },
    { label: '135 degree back right quarter', rotation: 'rotate-45', position: 'col-start-3 row-start-1' },
    { label: 'facing right', rotation: 'rotate-90', position: 'col-start-3 row-start-2' },
    { label: '45 degree right', rotation: 'rotate-135', position: 'col-start-3 row-start-3' },
    { label: 'facing strait forward', rotation: 'rotate-180', position: 'col-start-2 row-start-3' },
    { label: '45 left', rotation: '-rotate-135', position: 'col-start-1 row-start-3' },
    { label: 'facing left', rotation: '-rotate-90', position: 'col-start-1 row-start-2' },
    { label: '135 degree back left quarter', rotation: '-rotate-45', position: 'col-start-1 row-start-1' },
];

const DirectionalPad: React.FC<DirectionalPadProps> = ({ selectedDirection, onSelectDirection }) => {
    return (
        <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full max-w-[280px] h-auto aspect-square mx-auto">
            {directions.map((dir) => {
                const isSelected = selectedDirection === dir.label;
                return (
                    <button
                        key={dir.label}
                        onClick={() => onSelectDirection(dir.label)}
                        className={`${dir.position} flex flex-col items-center justify-center p-1 rounded-md transition-colors duration-200 ease-in-out text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500
                            ${isSelected ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-700 hover:bg-gray-600'}
                        `}
                        aria-label={`Set direction to ${dir.label}`}
                        aria-pressed={isSelected}
                    >
                        <ArrowIcon className={`w-6 h-6 sm:w-8 sm:h-8 transform ${dir.rotation} text-red-400`} />
                        <span className="text-[10px] leading-tight text-center mt-1 text-gray-300">{dir.label}</span>
                    </button>
                )
            })}
        </div>
    );
};
export default DirectionalPad;