import PanelCategoryPage from './PanelCategoryPage';

export default function PanelReturned() {
  return (
    <PanelCategoryPage config={{
      sectionKey: 'returnedToFaculties',
      title: 'Returned to Faculties',
      description: 'Finalized papers returned with AI-generated answer keys.',
      seenKey: 'panel_seen_returned',
      showDownloadQP: true,
      showDownloadAK: true,
      showSubmit: false,
      showReturn: false,
    }} />
  );
}
