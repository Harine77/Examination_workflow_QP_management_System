import PanelSectionPage from './PanelSectionPage';

export default function PanelAwaitingReview() {
  return (
    <PanelSectionPage
      title="Awaiting Review"
      description="Papers assigned to panel — submit to HOD or return to faculties."
      sectionKey="pendingReview"
      accentColor="border-blue-400"
    />
  );
}
