import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { router } from "expo-router";
import { RotateCcw } from "lucide-react-native";
import { useSessionStore } from "@/stores/session-store";
import { normalizeAgentSnapshot } from "@/utils/agent-snapshots";
import { prepareWorkspaceTab } from "@/utils/workspace-navigation";
import { AdaptiveModalSheet, AdaptiveTextInput } from "./adaptive-modal-sheet";
import { Button } from "@/components/ui/button";

const styles = StyleSheet.create((theme) => ({
  helper: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
  field: {
    gap: theme.spacing[2],
  },
  label: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  input: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    color: theme.colors.foreground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  error: {
    color: theme.colors.destructive,
    fontSize: theme.fontSize.sm,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing[3],
    marginTop: theme.spacing[2],
  },
}));

export interface ResumeSessionModalProps {
  visible: boolean;
  onClose: () => void;
  serverId: string;
}

export function ResumeSessionModal({ visible, onClose, serverId }: ResumeSessionModalProps) {
  const { theme } = useUnistyles();
  const client = useSessionStore((state) => state.sessions[serverId]?.client ?? null);

  const [sessionId, setSessionId] = useState("");
  const [isResuming, setIsResuming] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleClose = useCallback(() => {
    if (isResuming) return;
    setSessionId("");
    setErrorMessage("");
    onClose();
  }, [isResuming, onClose]);

  const handleResume = useCallback(async () => {
    if (isResuming) return;
    const trimmed = sessionId.trim();
    if (!trimmed) {
      setErrorMessage("Paste a session ID to resume");
      return;
    }
    if (!client) {
      setErrorMessage("Not connected to daemon");
      return;
    }

    try {
      setIsResuming(true);
      setErrorMessage("");

      const result = await client.resumeAgent({
        provider: "claude",
        sessionId: trimmed,
        nativeHandle: trimmed,
        metadata: { provider: "claude" },
      });

      useSessionStore.getState().setAgents(serverId, (prev) => {
        const next = new Map(prev);
        next.set(result.id, normalizeAgentSnapshot(result, serverId));
        return next;
      });

      const route = prepareWorkspaceTab({
        serverId,
        workspaceId: result.cwd,
        target: { kind: "agent", agentId: result.id },
      });

      handleClose();
      router.replace(route as any);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to resume session");
    } finally {
      setIsResuming(false);
    }
  }, [client, handleClose, isResuming, serverId, sessionId]);

  return (
    <AdaptiveModalSheet title="Resume session" visible={visible} onClose={handleClose}>
      <Text style={styles.helper}>
        Paste the Claude session ID to resume a previous conversation.
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Session ID</Text>
        <AdaptiveTextInput
          value={sessionId}
          onChangeText={setSessionId}
          placeholder="a8c7f7e5-c0ff-46d4-ade7-79d83490006e"
          placeholderTextColor={theme.colors.foregroundMuted}
          style={styles.input}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </View>

      <View style={styles.actions}>
        <Button
          style={{ flex: 1 }}
          variant="secondary"
          onPress={handleClose}
          disabled={isResuming}
        >
          Cancel
        </Button>
        <Button
          style={{ flex: 1 }}
          variant="default"
          onPress={() => void handleResume()}
          disabled={isResuming || !sessionId.trim()}
          leftIcon={<RotateCcw size={16} color={theme.colors.palette.white} />}
        >
          {isResuming ? "Resuming..." : "Resume"}
        </Button>
      </View>
    </AdaptiveModalSheet>
  );
}
