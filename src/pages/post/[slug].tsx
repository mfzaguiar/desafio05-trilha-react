/* eslint-disable no-param-reassign */
/* eslint-disable no-return-assign */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import {
  AiOutlineCalendar,
  AiOutlineUser,
  AiOutlineClockCircle,
} from 'react-icons/ai';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import styles from './post.module.scss';
import commonStyles from '../../styles/common.module.scss';
import Comments from '../../components/Comments';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface NavigationProps {
  prevPost: {
    uid: string;
    data: {
      title: string;
    };
  };
  nextPost: {
    uid: string;
    data: {
      title: string;
    };
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  navigation: NavigationProps;
}

export default function Post({ post, preview, navigation }: PostProps) {
  const router = useRouter();

  function countWords(str) {
    str = str.replace(/(^\s*)|(\s*$)/gi, '');
    str = str.replace(/[ ]{2,}/gi, ' ');
    str = str.replace(/\n /, '\n');
    return str.split(' ').length;
  }

  const numberOfWords = post.data.content[0].body.reduce((acc, element) => {
    const words = countWords(element.text);
    return (acc += words);
  }, 0);

  const timeToRead = Math.ceil(numberOfWords / 200);

  const hasModification =
    post.last_publication_date !== post.first_publication_date;

  const editedFirstPublicationDate =
    format(new Date(post?.first_publication_date), 'dd MMM yyyy', {
      locale: ptBR,
    }) || null;

  const editedLastPublicationDate =
    format(
      new Date(post?.last_publication_date),
      "'* editado em' dd MMM yyyy', às' H:m",
      {
        locale: ptBR,
      }
    ) || null;

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  return (
    <>
      <Header />
      <Head>
        <title>{post.data?.title} | Spacetraveling</title>
      </Head>
      <main className={styles.container}>
        <img src={post.data?.banner?.url} alt="banner" />
        <div className={styles.content}>
          <h1>{post.data?.title}</h1>
          <div className={styles.infos}>
            <div>
              <AiOutlineCalendar />
              {editedFirstPublicationDate}
            </div>
            <div style={{ textTransform: 'capitalize' }}>
              <AiOutlineUser />
              {post.data?.author}
            </div>
            <div>
              <AiOutlineClockCircle />
              {timeToRead} min
            </div>
          </div>
          {hasModification && <span>{editedLastPublicationDate}</span>}

          {post.data.content.map(content => {
            return (
              <article key={content.heading}>
                <h2>{content.heading}</h2>
                <div
                  className={styles.postContent}
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </article>
            );
          })}
          {!preview && (
            <footer>
              <hr />
              <div className={styles.navigation}>
                {navigation?.prevPost[0] && (
                  <div className={styles.navigationItem}>
                    {navigation?.prevPost[0].data.title}
                    <Link href={`/post/${navigation.prevPost[0].uid}`}>
                      <a>Post anterior</a>
                    </Link>
                  </div>
                )}
                {navigation?.nextPost[0] && (
                  <div className={styles.navigationItem}>
                    {navigation?.nextPost[0].data.title}
                    <Link href={`/post/${navigation.nextPost[0].uid}`}>
                      <a>Próximo post</a>
                    </Link>
                  </div>
                )}
              </div>
              <Comments />
            </footer>
          )}
          {preview && (
            <aside className={commonStyles.exitPreview}>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts'),
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref || null,
  });

  const prevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );
  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]',
    }
  );

  const post = {
    uid: response.uid,
    first_publication_date: response?.first_publication_date,
    last_publication_date: response?.last_publication_date,
    data: {
      banner: {
        url: response.data.banner.url,
      },
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: {
      preview,
      post,
      navigation: {
        prevPost: prevPost?.results,
        nextPost: nextPost?.results,
      },
    },
  };
};
