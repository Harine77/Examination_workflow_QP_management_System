import PanelCategoryPage from './PanelCategoryPage';

export default function PanelHODApproved() {
  return (
    <PanelCategoryPage config={{
      sectionKey: 'hodApproved',
      title: 'HOD Approved',
      description: 'Approved papers — can still be returned to faculties with answer key.',
      seenKey: 'panel_seen_hodApproved',
      showDownloadQP: true,
      showDownloadAK: false,
      showSubmit: false,
      showReturn: true,
    }} />
  );
}
