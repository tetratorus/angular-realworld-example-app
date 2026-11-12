import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { profileApi } from '../../api/client';
import type { ArticleListConfig } from '../../api/types';
import ArticleList from '../../components/ArticleList';

/** Port of features/profile/components/profile-articles.component.ts ("My Posts" tab). */
export default function ProfileArticles() {
  const { username } = useParams();
  const [articlesConfig, setArticlesConfig] = useState<ArticleListConfig | null>(null);

  useEffect(() => {
    profileApi.get(username!).then(profile =>
      setArticlesConfig({
        type: 'all',
        filters: {
          author: profile.username,
        },
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return articlesConfig && <ArticleList limit={10} config={articlesConfig} />;
}
