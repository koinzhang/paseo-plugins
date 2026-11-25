import { Icon } from "@getpaseo/plugin/client/ui";
import type { PluginTheme } from "@getpaseo/plugin";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ItemKind, ProjectSummary, WorkspaceSummary } from "../shared/contracts.ts";

const OPTIONS: ReadonlyArray<{ id: ItemKind; label: string; icon: string }> = [
  { id: "agent", label: "Agents", icon: "Bot" },
  { id: "note", label: "Notes", icon: "FileText" },
];

export function KindFilterMenu({
  value,
  theme,
  open,
  onOpenChange,
}: {
  value: ItemKind[];
  theme: PluginTheme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const c = theme.colors;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Filter: ${OPTIONS.filter((option) => value.includes(option.id)).map((option) => option.label).join(", ") || "none"}`}
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        onPress={() => onOpenChange(!open)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 8,
          backgroundColor: pressed || open ? c.surface2 : "transparent",
        })}
      >
        <Icon name="ListFilter" size={14} color={c.foreground} />
        <Icon name="ChevronDown" size={12} color={c.foregroundMuted} />
      </Pressable>
    </View>
  );
}
export function KindFilterMenuPanel({
  value,
  onChange,
  projects,
  projectKeys,
  onProjectChange,
  workspaces,
  workspaceIds,
  onWorkspaceChange,
  theme,
}: {
  value: ItemKind[];
  onChange: (kind: ItemKind) => void;
  projects?: ProjectSummary[];
  projectKeys?: string[] | null;
  onProjectChange?: (key: string) => void;
  workspaces?: WorkspaceSummary[];
  workspaceIds?: string[] | null;
  onWorkspaceChange?: (id: string) => void;
  theme: PluginTheme;
}) {
  const c = theme.colors;
  const optionRow = (icon: string, label: string, selected: boolean, onPress: () => void, struck = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Filter ${label}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 32,
        marginHorizontal: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: pressed || hovered ? c.surface2 : "transparent",
      })}
    >
      <Icon name={icon} size={14} color={c.foregroundMuted} />
      <Text style={{ flex: 1, minWidth: 0, color: c.foreground, fontSize: 13, textDecorationLine: struck ? "line-through" : "none" }} numberOfLines={1}>
        {label}
      </Text>
      {selected ? <Icon name="Check" size={14} color={c.foreground} /> : null}
    </Pressable>
  );
  return (
    <View accessibilityLabel="Projects and workspaces filter">
    <View
      style={{
        width: 240,
        maxHeight: 420,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface1,
        shadowColor: c.foreground,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        zIndex: 31,
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <ScrollView style={{ flexShrink: 1 }}>
        {OPTIONS.map((option) => (
          <View key={option.id}>
            {optionRow(option.icon, option.label, value.includes(option.id), () => onChange(option.id))}
          </View>
        ))}
        {projects?.length && projectKeys && onProjectChange ? (
          <View accessibilityLabel="Projects">
            <View style={{ height: 1, marginVertical: 4, backgroundColor: c.border }} />
            {projects.map((project) => (
              <View key={project.key}>
                {optionRow("Folder", `${project.label} · ${project.count}`, projectKeys.includes(project.key), () => onProjectChange(project.key), project.archived)}
              </View>
            ))}
          </View>
        ) : null}
        {workspaces?.length && workspaceIds && onWorkspaceChange ? (
          <View accessibilityLabel="Workspaces">
            <View style={{ height: 1, marginVertical: 4, backgroundColor: c.border }} />
            {workspaces.map((workspace) => (
              <View key={workspace.id}>
                {optionRow("PanelsTopLeft", `${workspace.label} · ${workspace.count}`, workspaceIds.includes(workspace.id), () => onWorkspaceChange(workspace.id), workspace.archived)}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
    </View>
  );
}

