import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { profileApi } from '../../api/client';
import type { ArticleListConfig } from '../../api/types';
import ArticleList from '../../components/ArticleList';

/** Port of features/profile/components/profile-favorites.component.ts ("Favorited Posts" tab). */
export default function ProfileFavorites() {
  const { username } = useParams();
  const [favoritesConfig, setFavoritesConfig] = useState<ArticleListConfig | null>(null);

  useEffect(() => {
    profileApi.get(username!).then(profile =>
      setFavoritesConfig({
        type: 'all',
        filters: {
          favorited: profile.username,
        },
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return favoritesConfig && <ArticleList limit={10} config={favoritesConfig} />;
}
