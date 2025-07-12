import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

interface SettingsPanelProps {
  settings: {
    fontSize: number;
    renderSideBySide: boolean;
    showDiffOnly: boolean;
    extraLines: number;
  };
  onSettingChange: (key: string, value: number | boolean) => void;
}

const SettingsPanel = ({ settings, onSettingChange }: SettingsPanelProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="fontSize">Font Size</Label>
          <span className="text-xs text-muted-foreground">
            {settings.fontSize}px
          </span>
        </div>
        <Slider
          id="fontSize"
          min={10}
          max={24}
          step={1}
          value={[settings.fontSize]}
          onValueChange={(value: number[]) => onSettingChange('fontSize', value[0])}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="extraLines">Context Lines</Label>
          <span className="text-xs text-muted-foreground">
            {settings.extraLines} lines
          </span>
        </div>
        <Slider
          id="extraLines"
          min={0}
          max={10}
          step={1}
          value={[settings.extraLines]}
          onValueChange={(value: number[]) => onSettingChange('extraLines', value[0])}
        />
      </div>

      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor="sideBySide">Side by Side</Label>
        <Switch
          id="sideBySide"
          checked={settings.renderSideBySide}
          onCheckedChange={(checked: boolean) => onSettingChange('renderSideBySide', checked)}
        />
      </div>

      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor="showDiffOnly">Show Changes Only</Label>
        <Switch
          id="showDiffOnly"
          checked={settings.showDiffOnly}
          onCheckedChange={(checked: boolean) => onSettingChange('showDiffOnly', checked)}
        />
      </div>
    </div>
  );
};

export default SettingsPanel; 