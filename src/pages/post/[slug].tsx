import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import { AiOutlineCalendar, AiOutlineUser, AiOutlineClockCircle } from 'react-icons/ai';
import Prismic from '@prismicio/client';
import { parseISO, format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
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

interface PostProps {
  post: Post;
}

 export default function Post({ post }: PostProps) {
  const router = useRouter();

  function countWords(str) {
    str = str.replace(/(^\s*)|(\s*$)/gi,"");
    str = str.replace(/[ ]{2,}/gi," ");
    str = str.replace(/\n /,"\n");
    return str.split(' ').length;
    }

  const numberOfWords = post.data.content[0].body.reduce((acc, element) => {
      const words = countWords(element.text);
      return acc += words;
  }, 0)

  const timeToRead = Math.ceil(numberOfWords/200);

  if (router.isFallback) {
    return <div>Carregando...</div>
  }

   return(
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
                  {format(parseISO(post.first_publication_date),
                    'dd MMM yyyy',
                    { locale: ptBR }
                    )
                  }
                </div>
                <div style={{textTransform: 'capitalize'}}>
                  <AiOutlineUser />
                  {post.data?.author}
                </div>
                <div>
                  <AiOutlineClockCircle />
                  {timeToRead} min
                </div>
            </div>

            {post.data.content.map(content => {
              return (
                <article key={content.heading}>
                  <h2>{content.heading}</h2>
                  <div
                      className={styles.postContent}
                      dangerouslySetInnerHTML={{
                        __html: RichText.asHtml(content.body)
                    }}
                  />
                </article>
              )
            })}
        </div>
      </main>
     </>
   )
 }

 export const getStaticPaths: GetStaticPaths = async () => {
   const prismic = getPrismicClient();

   const posts = await prismic.query([
     Prismic.Predicates.at('document.type','posts')
   ]);

   const paths = posts.results.map(post => {
     return {
       params: {
         slug: post.uid
       }
     }
   })

    return {
      paths,
      fallback: true
  }

 };

 export const getStaticProps: GetStaticProps = async ({ params }) => {
   const { slug } = params;

   const prismic = getPrismicClient();
   const response = await prismic.getByUID('posts', String(slug), {});

    const post = {
      uid: response.uid,
      first_publication_date: response.first_publication_date,
      data: {
      banner: {
      url: response.data.banner.url,
      },
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      content: response.data.content.map(content=> {
        return {
        heading: content.heading,
        body: [...content.body]
        }
      })
      }
    }

    return {
      props: {
        post
      }
    }
 };

