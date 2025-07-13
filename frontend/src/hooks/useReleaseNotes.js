import { useState, useEffect } from 'react';
import api from '../services/api';

const useReleaseNotes = (user) => {
  const [unviewedReleases, setUnviewedReleases] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for unviewed releases on user login
  useEffect(() => {
    if (user) {
      checkForUnviewedReleases();
    }
  }, [user]);

  const checkForUnviewedReleases = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/release-notes/unviewed');
      const releases = response.data.data;
      
      if (releases && releases.length > 0) {
        setUnviewedReleases(releases);
        
        // Show modal automatically if there are unviewed releases
        // with a small delay to ensure the app is fully loaded
        setTimeout(() => {
          setShowModal(true);
        }, 2000);
      }
    } catch (err) {
      console.error('Error checking for unviewed releases:', err);
      // Don't show error for this background check
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    // Clear unviewed releases after modal is closed
    setUnviewedReleases([]);
  };

  const refreshUnviewedReleases = () => {
    if (user) {
      checkForUnviewedReleases();
    }
  };

  return {
    unviewedReleases,
    showModal,
    loading,
    error,
    openModal,
    closeModal,
    refreshUnviewedReleases
  };
};

export default useReleaseNotes; 