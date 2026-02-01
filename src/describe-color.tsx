import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  closeMainWindow,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { pickColor } from "swift:../swift/color-picker";
import { describePickedColor, describeRgb, hexToRgb } from "./lib/color-describer";
import type { ColorDescription, PickedColor } from "./lib/types";

function colorDetailMarkdown(desc: ColorDescription): string {
  const lines: string[] = [];

  lines.push(`# ${desc.basicName.charAt(0).toUpperCase() + desc.basicName.slice(1)}`);
  lines.push("");
  lines.push(`## ${desc.detailedDescription}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("### Color Values");
  lines.push("");
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Hex | \`${desc.hex}\` |`);
  lines.push(`| RGB | \`rgb(${desc.rgb.r}, ${desc.rgb.g}, ${desc.rgb.b})\` |`);
  lines.push(`| HSL | \`hsl(${desc.hsl.h}, ${desc.hsl.s}%, ${desc.hsl.l}%)\` |`);
  lines.push(`| Basic Name | ${desc.basicName} |`);
  lines.push(`| Detailed Name | ${desc.detailedName} |`);
  lines.push("");

  if (desc.confusionWarnings.length > 0) {
    lines.push("### Colorblind Warnings");
    lines.push("");
    for (const w of desc.confusionWarnings) {
      lines.push(`> **${w.label}**: ${w.message}`);
      lines.push("");
    }
  }

  lines.push("### Colorblind Simulation");
  lines.push("");
  lines.push("How this color may appear to people with color vision deficiency:");
  lines.push("");
  lines.push(`| Condition | Appears As | Simulated Hex |`);
  lines.push(`|-----------|-----------|---------------|`);
  for (const sim of desc.simulations) {
    lines.push(`| ${sim.label} | ${sim.basicName} | \`${sim.hex}\` |`);
  }
  lines.push("");

  return lines.join("\n");
}

function ColorDetailView({ desc }: { desc: ColorDescription }) {
  return (
    <Detail
      markdown={colorDetailMarkdown(desc)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Color">
            <Detail.Metadata.TagList.Item text={desc.hex} color={desc.hex as Color} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Basic Name" text={desc.basicName} />
          <Detail.Metadata.Label title="Description" text={desc.detailedDescription} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Hex" text={desc.hex} />
          <Detail.Metadata.Label
            title="RGB"
            text={`${desc.rgb.r}, ${desc.rgb.g}, ${desc.rgb.b}`}
          />
          <Detail.Metadata.Label
            title="HSL"
            text={`${desc.hsl.h}\u00B0, ${desc.hsl.s}%, ${desc.hsl.l}%`}
          />
          <Detail.Metadata.Separator />
          {desc.simulations.map((sim) => (
            <Detail.Metadata.TagList key={sim.type} title={sim.label}>
              <Detail.Metadata.TagList.Item
                text={`${sim.basicName} (${sim.hex})`}
                color={sim.hex as Color}
              />
            </Detail.Metadata.TagList>
          ))}
          {desc.confusionWarnings.length > 0 && <Detail.Metadata.Separator />}
          {desc.confusionWarnings.map((w) => (
            <Detail.Metadata.Label key={w.type} title={`Warning: ${w.label}`} text={w.message} />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Hex"
            content={desc.hex}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Description"
            content={desc.detailedDescription}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy All Info"
            content={`${desc.detailedDescription} (${desc.hex})\nRGB: ${desc.rgb.r}, ${desc.rgb.g}, ${desc.rgb.b}\nHSL: ${desc.hsl.h}\u00B0, ${desc.hsl.s}%, ${desc.hsl.l}%`}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  async function handlePickColor() {
    await closeMainWindow();
    const color = (await pickColor()) as PickedColor | undefined;
    if (!color) return;
    const desc = describePickedColor(color);
    push(<ColorDetailView desc={desc} />);
  }

  function getHexPreview(): ColorDescription | null {
    const clean = searchText.trim();
    if (clean.length < 3) return null;
    const normalized = clean.startsWith("#") ? clean : `#${clean}`;
    const rgb = hexToRgb(normalized);
    if (!rgb) return null;
    return describeRgb(rgb);
  }

  const preview = getHexPreview();

  return (
    <List
      searchBarPlaceholder="Enter hex color (e.g. FF5733) or pick from screen..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      <List.Item
        title="Pick Color from Screen"
        subtitle="Use the eyedropper to select any pixel"
        icon={Icon.EyeDropper}
        actions={
          <ActionPanel>
            <Action title="Pick Color" icon={Icon.EyeDropper} onAction={handlePickColor} />
          </ActionPanel>
        }
      />
      {preview && (
        <List.Item
          title={preview.detailedDescription}
          subtitle={preview.hex}
          icon={{ source: Icon.CircleFilled, tintColor: preview.hex as Color }}
          accessories={[
            { text: preview.basicName },
            ...(preview.confusionWarnings.length > 0
              ? [{ icon: Icon.ExclamationMark, tooltip: "Has colorblind confusion warnings" }]
              : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                icon={Icon.Eye}
                target={<ColorDetailView desc={preview} />}
              />
              <Action.CopyToClipboard
                title="Copy Hex"
                content={preview.hex}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Description"
                content={preview.detailedDescription}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
