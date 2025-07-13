import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ReleaseNotesModal from './ReleaseNotesModal';
import useReleaseNotes from '../hooks/useReleaseNotes';

const ReleaseNotesWrapper = ({ children }) => {
  const { user } = useAuth();
  const {
    unviewedReleases,
    showModal,
    closeModal
  } = useReleaseNotes(user);

  return (
    <>
      {children}
      {showModal && unviewedReleases.length > 0 && (
        <ReleaseNotesModal
          isOpen={showModal}
          onClose={closeModal}
          releaseNotes={unviewedReleases}
        />
      )}
    </>
  );
};

export default ReleaseNotesWrapper; 