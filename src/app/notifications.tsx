import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, EmptyState, ErrorState, Icon } from '@/components/wayfare/primitives';
import { ListSkeleton } from '@/components/wayfare/skeleton';
import { Radius, Space, themedStyles, Type, W } from '@/constants/wayfare';
import { isToday, relativeTime, useMarkNotificationsRead, useNotifications, type AppNotification } from '@/hooks/use-notifications';
import { useAuth } from '@/providers/auth-provider';

/** Figma "Wayfare / Notifications" (A5): grouped Today / Earlier, unread dot, Mark all read. */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const n = useNotifications();
  const markRead = useMarkNotificationsRead();

  const groups = [
    { title: 'Today', items: n.feed.filter((x) => isToday(x.at)) },
    { title: 'Earlier', items: n.feed.filter((x) => !isToday(x.at)) },
  ].filter((g) => g.items.length > 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Space.sm }]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[Type.heading, styles.title]}>Notifications</Text>
        {n.unread.size > 0 ? (
          <Pressable onPress={markRead} accessibilityRole="button" hitSlop={8} style={styles.markAll}>
            <Text style={[Type.bodyMedium, { color: W.accentStrong }]}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={styles.balance} />
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Space.xxxl }]}>
        {n.isPending ? (
          <ListSkeleton rows={5} />
        ) : n.isError ? (
          <ErrorState height={400} onRetry={() => n.refetch()} />
        ) : groups.length === 0 ? (
          <EmptyState
            height={520}
            icon="bell"
            title="You're all caught up"
            message="We'll let you know about bookings, trip reminders and new places to explore."
            actionLabel="Back to home"
            onAction={() => router.replace('/')}
          />
        ) : (
          <>
            {groups.map((g) => (
              <View key={g.title} style={styles.group}>
                <Text style={[Type.micro, styles.groupTitle]}>{g.title}</Text>
                {g.items.map((item, i) => (
                  <NotificationRow key={item.id} item={item} unread={n.unread.has(item.id)} last={i === g.items.length - 1} />
                ))}
              </View>
            ))}
            {!session ? (
              <EmptyState
                height={200}
                title="Get trip updates"
                message="Sign in to see booking confirmations and reminders before you travel."
                actionLabel="Sign in"
                onAction={() => router.push({ pathname: '/sign-in', params: { returnTo: '/notifications' } })}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function NotificationRow({ item, unread, last }: { item: AppNotification; unread: boolean; last: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => (item.href ? router.push(item.href) : undefined)}
      accessibilityRole={item.href ? 'button' : 'text'}
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title}. ${item.message}. ${relativeTime(item.at)}`}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && { opacity: 0.7 }]}>
      <View style={styles.iconCircle}>
        <Icon name={item.icon} size={20} color={W.accentStrong} />
      </View>
      <View style={styles.text}>
        <Text style={[unread ? Type.subheading : Type.body, { color: W.text }]}>{item.title}</Text>
        <Text style={[Type.caption, { color: W.textSecondary }]}>{item.message}</Text>
        <Text style={[Type.micro, { color: W.textSecondary }]}>{relativeTime(item.at)}</Text>
      </View>
      {unread ? <View style={styles.unread} /> : null}
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: W.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingHorizontal: Space.screenX - 4 },
  title: { flex: 1, textAlign: 'center', color: W.text },
  markAll: { minHeight: 44, justifyContent: 'center' },
  balance: { width: 44, height: 44 },
  body: { paddingHorizontal: Space.screenX, paddingTop: Space.lg, gap: Space.xxl },
  group: { gap: 0 },
  groupTitle: { color: W.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Space.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md, paddingVertical: Space.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: W.border },
  iconCircle: { width: 44, height: 44, borderRadius: Radius.pill, backgroundColor: W.accentSoft, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  unread: { width: 8, height: 8, borderRadius: Radius.pill, backgroundColor: W.accent, marginTop: 8 },
}));
