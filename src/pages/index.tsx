/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useState } from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Prismic from '@prismicio/client';
import { AiOutlineCalendar, AiOutlineUser } from 'react-icons/ai';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Header from '../components/Header';

import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home({
  postsPagination: { next_page, results },
  preview,
}: HomeProps) {
  const [posts, setPosts] = useState(
    results.map(post => {
      return {
        ...post,
        first_publication_date: format(
          new Date(post.first_publication_date),
          'dd MMM yyyy',
          { locale: ptBR }
        ),
      };
    })
  );

  const [nextPage, setNextPage] = useState(next_page);

  function handleLoadMore() {
    fetch(next_page)
      .then(response => response.json())
      .then(response => {
        const newPosts = response.results.map(post => {
          return {
            uid: post.uid,
            first_publication_date: format(
              new Date(post.first_publication_date),
              'dd MMM yyyy',
              { locale: ptBR }
            ),
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle,
              author: post.data.author,
            },
          };
        });
        setPosts([...posts, ...newPosts]);
        setNextPage(response.next_page);
      })
      .catch(err => {
        console.error('Failed retrieving information', err);
      });
  }

  return (
    <>
      <Head>
        <title>Home - spacetraveling</title>
      </Head>
      <Header />

      <main className={commonStyles.container}>
        {posts.map(post => (
          <Link key={post?.uid} href={`/post/${post?.uid}`}>
            <a className={styles.teste}>
              <div className={styles.posts}>
                <strong>{post?.data?.title}</strong>
                <span>{post?.data?.subtitle}</span>
                <ul>
                  <li>
                    <AiOutlineCalendar />
                    {post.first_publication_date}
                  </li>
                  <li style={{ textTransform: 'capitalize' }}>
                    <AiOutlineUser />
                    {post?.data?.author}
                  </li>
                </ul>
              </div>
            </a>
          </Link>
        ))}
        {nextPage && (
          <button
            className={styles.loadmore}
            type="button"
            onClick={handleLoadMore}
          >
            Carregar mais posts
          </button>
        )}
        {preview && (
          <aside className={commonStyles.exitPreview}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ preview = false }) => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 2,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  const postsPagination = {
    next_page: postsResponse.next_page,
    results: posts,
  };

  return {
    props: {
      postsPagination,
      preview,
    },
  };
};
