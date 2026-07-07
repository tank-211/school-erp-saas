import { useState, useEffect } from 'react';
import {
  getApplicationProgress,
  getApplicationDetails,
  saveStudentInfo,
  saveParentInfo,
  saveAcademicInfo,
  saveDocuments,
  submitApplication,
  deleteApplication
} from '../services/applicationService.js';

/**
 * Custom hook for managing multi-step application
 * Handles progress tracking, data fetching, and step saving
 */
export function useApplication(applicationId) {
  const effectiveApplicationId = applicationId || sessionStorage.getItem('activeAdmissionId');
  const [progress, setProgress] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Load progress and details on mount
  useEffect(() => {
    if (!effectiveApplicationId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch progress and details in parallel
        const [progressData, detailsData] = await Promise.all([
          getApplicationProgress(effectiveApplicationId),
          getApplicationDetails(effectiveApplicationId)
        ]);

        setProgress(progressData);
        setDetails(detailsData);
        setCurrentStep(progressData.current_step || 1);

        console.log('✅ Application loaded:', {
          current_step: progressData.current_step,
          steps: progressData.steps
        });
      } catch (err) {
        console.error('❌ Error loading application:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [effectiveApplicationId]);

  // Save student info and advance to next step
  const handleSaveStudentInfo = async (studentData) => {
    try {
      setError(null);
      setLoading(true);

      await saveStudentInfo(effectiveApplicationId, studentData);

      // Update progress
      const updatedProgress = await getApplicationProgress(effectiveApplicationId);
      setProgress(updatedProgress);
      setCurrentStep(updatedProgress.current_step);

      console.log('✅ Student info saved, advancing to step:', updatedProgress.current_step);
      return true;
    } catch (err) {
      console.error('❌ Error saving student info:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Save parent info and advance to next step
  const handleSaveParentInfo = async (parentData) => {
    try {
      setError(null);
      setLoading(true);

      await saveParentInfo(effectiveApplicationId, parentData);

      const updatedProgress = await getApplicationProgress(effectiveApplicationId);
      setProgress(updatedProgress);
      setCurrentStep(updatedProgress.current_step);

      console.log('✅ Parent info saved, advancing to step:', updatedProgress.current_step);
      return true;
    } catch (err) {
      console.error('❌ Error saving parent info:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Save academic info and advance to next step
  const handleSaveAcademicInfo = async (academicData) => {
    try {
      setError(null);
      setLoading(true);

      await saveAcademicInfo(effectiveApplicationId, academicData);

      const updatedProgress = await getApplicationProgress(effectiveApplicationId);
      setProgress(updatedProgress);
      setCurrentStep(updatedProgress.current_step);

      console.log('✅ Academic info saved, advancing to step:', updatedProgress.current_step);
      return true;
    } catch (err) {
      console.error('❌ Error saving academic info:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Save documents and advance to next step
  const handleSaveDocuments = async (documents) => {
    try {
      setError(null);
      setLoading(true);

      await saveDocuments(effectiveApplicationId, documents);

      const updatedProgress = await getApplicationProgress(effectiveApplicationId);
      setProgress(updatedProgress);
      setCurrentStep(updatedProgress.current_step);

      console.log('✅ Documents saved, advancing to step:', updatedProgress.current_step);
      return true;
    } catch (err) {
      console.error('❌ Error saving documents:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Submit application
  const handleSubmitApplication = async () => {
    try {
      setError(null);
      setLoading(true);

      await submitApplication(effectiveApplicationId);

      const updatedProgress = await getApplicationProgress(effectiveApplicationId);
      setProgress(updatedProgress);

      console.log('✅ Application submitted!');
      return true;
    } catch (err) {
      console.error('❌ Error submitting application:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Check if step is completed
  const isStepCompleted = (step) => {
    if (!progress) return false;
    if (progress.status === 'submitted') {
      return true;
    }

    return Number(currentStep || progress.current_step || 1) > step;
  };

  // Delete application (only allowed for draft status)
  const handleDeleteApplication = async () => {
    try {
      setError(null);
      setLoading(true);

      await deleteApplication(effectiveApplicationId);

      console.log('✅ Application deleted successfully');
      return true;
    } catch (err) {
      console.error('❌ Error deleting application:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    applicationId: effectiveApplicationId,
    progress,
    details,
    loading,
    error,
    currentStep,
    isStepCompleted,
    handleSaveStudentInfo,
    handleSaveParentInfo,
    handleSaveAcademicInfo,
    handleSaveDocuments,
    handleSubmitApplication,
    handleDeleteApplication
  };
}
