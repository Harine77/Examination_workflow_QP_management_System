import PanelCategoryPage from './PanelCategoryPage';

export default function PanelSubmittedToHOD() {
  return (
    <PanelCategoryPage config={{
      sectionKey: 'submittedToHod',
      title: 'Submitted to HOD',
      description: 'Papers already forwarded to HOD for approval.',
      seenKey: 'panel_seen_submittedToHod',
      showDownloadQP: true,
      showDownloadAK: false,
      showSubmit: false,
      showReturn: false,
    }} />
  );
}
