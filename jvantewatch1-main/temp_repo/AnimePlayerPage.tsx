import React, { useState, useEffect } from 'react';
import CustomPlayer from './CustomPlayer';

interface AnimePlayerPageProps {
  animeTitle: string;
  animeId: string;
  episode: number;
}

export const AnimePlayerPage: React.FC<AnimePlayerPageProps> = ({
  animeTitle,
  animeId,
  episode
}) => {
  const [playerUrl, setPlayerUrl] = useState<string>('');
  const [availableQualities, setAvailableQualities] = useState<string[]>(['720', '480']);
  const [selectedQuality, setSelectedQuality] = useState<string>('720');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    fetchPlayerUrl();
  }, [animeTitle, episode, selectedQuality]);

  const fetchPlayerUrl = async () => {
    try {
      setLoading(true);
      setError('');

      // Сначала получаем доступные источники
      const sourcesResponse = await fetch(
        `/api/anime-sources?title=${encodeURIComponent(animeTitle)}&episodes=${episode}`
      );
      
      if (!sourcesResponse.ok) {
        throw new Error('Не удалось получить источники аниме');
      }

      const sourcesData = await sourcesResponse.json();
      const sources = sourcesData.sources || [];

      if (sources.length === 0) {
        throw new Error('Источники для этого аниме не найдены');
      }

      // Используем первый доступный источник
      const selectedSource = sources[0];
      setAvailableQualities(selectedSource.qualities || ['720', '480']);

      // Получаем URL плеера
      const playerResponse = await fetch(
        `/api/anime-player?` +
        `title=${encodeURIComponent(animeTitle)}&` +
        `episode=${episode}&` +
        `quality=${selectedQuality}&` +
        `voice=${selectedSource.voice.toLowerCase()}&` +
        `provider=${selectedSource.provider}&` +
        `shikimoriId=${animeId}`
      );

      if (!playerResponse.ok) {
        throw new Error('Не удалось получить URL плеера');
      }

      const playerData = await playerResponse.json();
      setPlayerUrl(playerData.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      console.error('Player fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
    setCurrentTime(0);
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-bg-main">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-text-main mt-4">Загрузка плеера...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-bg-main">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Ошибка</div>
          <p className="text-text-main">{error}</p>
          <button
            onClick={fetchPlayerUrl}
            className="mt-6 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-bg-main min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-text-main text-3xl font-bold mb-2">{animeTitle}</h1>
          <p className="text-text-muted">Серия {episode}</p>
        </div>

        {playerUrl && (
          <div className="rounded-lg overflow-hidden shadow-2xl mb-8">
            <CustomPlayer
              src={playerUrl}
              title={`${animeTitle} - Серия ${episode}`}
              qualities={availableQualities}
              onQualityChange={handleQualityChange}
              isPlaying={isPlaying}
              onPlayStateChange={setIsPlaying}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
            />
          </div>
        )}

        {/* Additional Info */}
        <div className="bg-bg-card border border-border-card rounded-lg p-6 text-text-main">
          <h2 className="text-xl font-bold mb-4">Информация</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-text-muted">Название</p>
              <p className="text-text-main font-semibold">{animeTitle}</p>
            </div>
            <div>
              <p className="text-text-muted">Текущая серия</p>
              <p className="text-text-main font-semibold">{episode}</p>
            </div>
            <div>
              <p className="text-text-muted">Доступное качество</p>
              <p className="text-text-main font-semibold">{availableQualities.join(', ')}p</p>
            </div>
            <div>
              <p className="text-text-muted">Выбранное качество</p>
              <p className="text-text-main font-semibold">{selectedQuality}p</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimePlayerPage;
