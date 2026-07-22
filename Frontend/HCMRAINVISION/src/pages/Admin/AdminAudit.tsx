/**
 * Admin – audit data (user reports to review).
 */
import { useState, useEffect } from 'react';
import { getAuditData, getTrainingImages, reviewTrainingImage, type TrainingImageCandidate, type TrainingLabel } from '../../services/adminApi';
import { apiBaseURL } from '../../services/apiClient';
import type { AuditDataItemDto } from '../../types/api';
import { getApiErrorMessage } from './adminShared';
import AdminLoadingBlock from './AdminLoadingBlock';
import AdminErrorMessage from './AdminErrorMessage';

export default function AdminAudit() {
  const [items, setItems] = useState<AuditDataItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trainingImages, setTrainingImages] = useState<TrainingImageCandidate[]>([]);
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getAuditData(), getTrainingImages()])
      .then(([data, candidates]) => {
        setItems(Array.isArray(data) ? data : []);
        setTrainingImages(candidates);
      })
      .catch((e) => setError(getApiErrorMessage(e, 'Tải dữ liệu thất bại')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLoadingBlock />;
  if (error) return <AdminErrorMessage message={error} />;

  const resolveImageUrl = (url: string) => {
    if (/^https?:\/\//i.test(url)) return url;
    return `${apiBaseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  };

  const submitReview = async (weatherLogId: number, label: TrainingLabel) => {
    setReviewingId(weatherLogId);
    try {
      await reviewTrainingImage(weatherLogId, label);
      setTrainingImages((current) => current.filter((item) => item.WeatherLogId !== weatherLogId));
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Không lưu được nhãn training'));
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Báo cáo cần duyệt</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ReportId</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CameraId</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ảnh</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {(items ?? []).map((a) => (
                <tr key={a.ReportId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{a.ReportId}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{a.CameraId}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{a.UserSaid}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{a.AISaid} ({a.AIConfidence?.toFixed(2)})</td>
                  <td className="px-4 py-3 text-sm">
                    {a.ImageUrl ? (
                      <a href={a.ImageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Xem
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.Note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(items ?? []).length === 0 && <p className="p-6 text-gray-500 text-center">Chưa có báo cáo nào.</p>}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Duyệt ảnh training camera thật</h2>
          <p className="mt-1 text-sm text-gray-600">Chỉ ảnh được gán Rain hoặc NoRain mới được trainer v2 sử dụng.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trainingImages.map((item) => (
            <article key={item.WeatherLogId} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <img src={resolveImageUrl(item.ImageUrl)} alt={`Camera ${item.CameraId}`} className="h-48 w-full bg-gray-100 object-cover" />
              <div className="space-y-3 p-4">
                <div>
                  <p className="font-medium text-gray-900">{item.CameraId}</p>
                  <p className="text-xs text-gray-500">AI thô: {item.RawIsRaining ? 'Rain' : 'NoRain'} ({(item.RawConfidence * 100).toFixed(1)}%)</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['Rain', 'NoRain', 'Uncertain', 'InvalidImage'] as TrainingLabel[]).map((label) => (
                    <button
                      key={label}
                      type="button"
                      disabled={reviewingId === item.WeatherLogId}
                      onClick={() => submitReview(item.WeatherLogId, label)}
                      className="rounded-lg border border-gray-300 px-2 py-2 text-sm font-medium text-gray-700 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
        {trainingImages.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">Chưa có ảnh mới cần duyệt.</p>}
      </section>
    </div>
  );
}
