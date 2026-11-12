/** Placeholder rendered for routes whose screen has not been migrated yet. */
export default function NotMigrated({ screen }: { screen: string }) {
  return (
    <div className="container page" data-not-migrated={screen}>
      <p>Screen “{screen}” has not been migrated to React yet.</p>
    </div>
  );
}
