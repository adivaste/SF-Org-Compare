import { Fragment } from 'react';
import * as Switch from '@radix-ui/react-switch';
import * as Slider from '@radix-ui/react-slider';
import { cn } from '../utils/styles';

interface SettingsPanelProps {
  settings: {
    fontSize: number;
    renderSideBySide: boolean;
    showDiffOnly: boolean;
    extraLines: number;
  };
  onSettingChange: (key: string, value: any) => void;
}

const SettingsPanel = ({ settings, onSettingChange }: SettingsPanelProps) => {
  return (
    <div className="p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 items-center">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Font Size
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {settings.fontSize}px
            </span>
          </div>
          <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-5"
            value={[settings.fontSize]}
            onValueChange={([value]) => onSettingChange('fontSize', value)}
            max={24}
            min={10}
            step={1}
          >
            <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-[3px]">
              <Slider.Range className="absolute bg-indigo-500 rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb
              className="block w-4 h-4 bg-white border-2 border-indigo-500 rounded-full hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label="Font size"
            />
          </Slider.Root>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Context Lines
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {settings.extraLines} lines
            </span>
          </div>
          <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-5"
            value={[settings.extraLines]}
            onValueChange={([value]) => onSettingChange('extraLines', value)}
            max={10}
            min={0}
            step={1}
          >
            <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-[3px]">
              <Slider.Range className="absolute bg-indigo-500 rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb
              className="block w-4 h-4 bg-white border-2 border-indigo-500 rounded-full hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label="Context lines"
            />
          </Slider.Root>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Side by Side
          </label>
          <Switch.Root
            checked={settings.renderSideBySide}
            onCheckedChange={(checked) => onSettingChange('renderSideBySide', checked)}
            className={cn(
              'group',
              'radix-state-checked:bg-indigo-500',
              'radix-state-unchecked:bg-gray-200 dark:radix-state-unchecked:bg-gray-700',
              'relative inline-flex h-[24px] w-[44px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
            )}
          >
            <Switch.Thumb
              className={cn(
                'group-radix-state-checked:translate-x-5',
                'group-radix-state-unchecked:translate-x-0',
                'pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out'
              )}
            />
          </Switch.Root>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Show Changes Only
          </label>
          <Switch.Root
            checked={settings.showDiffOnly}
            onCheckedChange={(checked) => onSettingChange('showDiffOnly', checked)}
            className={cn(
              'group',
              'radix-state-checked:bg-indigo-500',
              'radix-state-unchecked:bg-gray-200 dark:radix-state-unchecked:bg-gray-700',
              'relative inline-flex h-[24px] w-[44px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
            )}
          >
            <Switch.Thumb
              className={cn(
                'group-radix-state-checked:translate-x-5',
                'group-radix-state-unchecked:translate-x-0',
                'pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out'
              )}
            />
          </Switch.Root>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel; 