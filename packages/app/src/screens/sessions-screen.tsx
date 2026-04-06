import { useMemo, useState, useCallback, useEffect } from "react";
import { View, Text } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { ChevronLeft, RotateCcw } from "lucide-react-native";
import { MenuHeader } from "@/components/headers/menu-header";
import { Button } from "@/components/ui/button";
import { AgentList } from "@/components/agent-list";
import { useAllAgentsList } from "@/hooks/use-all-agents-list";
import { buildHostOpenProjectRoute } from "@/utils/host-routes";
import { ResumeSessionModal } from "@/components/resume-session-modal";

export function SessionsScreen({ serverId }: { serverId: string }) {
  const isFocused = useIsFocused();

  if (!isFocused) {
    return <View style={styles.container} />;
  }

  return <SessionsScreenContent serverId={serverId} />;
}

function SessionsScreenContent({ serverId }: { serverId: string }) {
  const { theme } = useUnistyles();
  const { agents, isRevalidating, refreshAll } = useAllAgentsList({
    serverId,
    includeArchived: true,
  });

  // Track user-initiated refresh to avoid showing spinner on background revalidation
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [isResumeModalVisible, setIsResumeModalVisible] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsManualRefresh(true);
    refreshAll();
  }, [refreshAll]);

  // Reset manual refresh flag when revalidation completes
  useEffect(() => {
    if (!isRevalidating && isManualRefresh) {
      setIsManualRefresh(false);
    }
  }, [isRevalidating, isManualRefresh]);

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [agents]);

  const resumeFooter = (
    <View style={{ padding: theme.spacing[4] }}>
      <Button
        variant="ghost"
        leftIcon={<RotateCcw size={16} color={theme.colors.foregroundMuted} />}
        onPress={() => setIsResumeModalVisible(true)}
      >
        Resume by session ID
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      <MenuHeader title="Sessions" />
      {sortedAgents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No sessions yet</Text>
          <Button
            variant="ghost"
            leftIcon={ChevronLeft}
            onPress={() => router.navigate(buildHostOpenProjectRoute(serverId))}
          >
            Back
          </Button>
          {resumeFooter}
        </View>
      ) : (
        <AgentList
          agents={sortedAgents}
          showCheckoutInfo={false}
          isRefreshing={isManualRefresh && isRevalidating}
          onRefresh={handleRefresh}
          showAttentionIndicator={false}
          listFooterComponent={resumeFooter}
        />
      )}
      <ResumeSessionModal
        visible={isResumeModalVisible}
        onClose={() => setIsResumeModalVisible(false)}
        serverId={serverId}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing[6],
    padding: theme.spacing[6],
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.lg,
  },
}));
