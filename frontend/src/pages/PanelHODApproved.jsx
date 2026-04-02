import PanelSectionPage from './PanelSectionPage';

export default function PanelHODApproved() {
  return (
    <PanelSectionPage
      title="HOD Approved"
      description="Approved papers — can still be returned to faculties with answer key."
      sectionKey="hodApproved"
      accentColor="border-green-400"
    />
  );
}
