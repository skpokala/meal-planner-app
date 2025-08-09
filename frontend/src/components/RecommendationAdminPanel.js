import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const MODES = [
  { value: 'top_normalized', label: 'Top-normalized (current default)', desc: 'Scales each list so the top item is 100%. Simple and relative.' },
  { value: 'fixed_exponential', label: 'Fixed-scale (exponential)', desc: 'Maps recency-weighted rate via 1 - e^{-k r} for stable cross-page comparisons.' },
  { value: 'percentile', label: 'Percentile within meal type', desc: 'Shows the percentile rank among similar meals.' },
  { value: 'zscore_sigmoid', label: 'Z-score to sigmoid', desc: 'Converts scores to z-scores and maps via sigmoid to emphasize above-average.' },
  { value: 'log_count', label: 'Log-scaled usage', desc: 'Uses log(1+count) against a fixed cap to dampen outliers.' },
  { value: 'bayesian', label: 'Bayesian-smoothed rate', desc: 'Applies a prior to stabilize low-sample meals before scaling.' },
  { value: 'decile', label: 'Rank by deciles', desc: 'Buckets into 10% bands for easy interpretation.' },
  { value: 'wilson', label: 'Wilson lower bound', desc: 'Conservative lower confidence bound of popularity proportion.' },
  { value: 'multi_factor', label: 'Multi-factor', desc: 'Combines recency, rating, and prep time with fixed weights.' },
];

const RecommendationAdminPanel = () => {
  const [mode, setMode] = useState('top_normalized');
  const [loading, setLoading] = useState(false);

  const loadMode = async () => {
    setLoading(true);
    try {
      const res = await api.get('/config/recommendation-scoring-mode');
      if (res.data?.success) setMode(res.data.mode);
    } catch (e) {
      toast.error('Failed to load current mode');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMode(); }, []);

  const saveMode = async () => {
    setLoading(true);
    try {
      const res = await api.put('/config/recommendation-scoring-mode', { mode });
      if (res.data?.success) {
        toast.success('Recommendation model updated');
      } else {
        throw new Error();
      }
    } catch (e) {
      toast.error('Failed to save mode');
    } finally {
      setLoading(false);
    }
  };

  const selected = MODES.find(m => m.value === mode);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          className="select"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          disabled={loading}
        >
          {MODES.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <button
          onClick={saveMode}
          disabled={loading}
          className="btn-primary flex items-center"
        >
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save
        </button>
        <button
          onClick={loadMode}
          disabled={loading}
          className="btn-secondary"
        >
          Reload
        </button>
      </div>
      {selected && (
        <div className="p-3 rounded-card bg-secondary-50 dark:bg-secondary-800 text-sm text-secondary-700 dark:text-secondary-300">
          {selected.desc}
        </div>
      )}
      <div className="text-xs text-secondary-500 dark:text-secondary-400">
        Changes apply immediately. Reload recommendations to see updated match percentages.
      </div>
    </div>
  );
};

export default RecommendationAdminPanel;


