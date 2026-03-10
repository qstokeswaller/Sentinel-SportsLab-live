// @ts-nocheck
import React, { useState } from 'react';
import { AlertTriangleIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useDeleteExercise } from '../../hooks/useExercises';
import { Button } from '@/components/ui/button';

interface DeleteExerciseModalProps {
  exercise: any;
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: string) => void;
}

export const DeleteExerciseModal = ({ exercise, isOpen, onClose, showToast }: DeleteExerciseModalProps) => {
  const deleteExercise = useDeleteExercise();
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !exercise) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteExercise.mutateAsync(exercise.id);
      showToast(`${exercise.name} deleted`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete exercise', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-5 text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 rounded-full mx-auto flex items-center justify-center">
            <AlertTriangleIcon size={22} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Delete Exercise</h3>
            <p className="text-sm text-slate-500">
              Are you sure you want to delete <span className="font-semibold text-slate-700">{exercise.name}</span>? This cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              <Trash2Icon size={13} className="mr-1.5" />
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
