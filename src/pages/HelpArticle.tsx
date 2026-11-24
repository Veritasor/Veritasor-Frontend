import { useParams } from 'react-router-dom'
import HelpArticleFeedback from '../components/HelpArticleFeedback'
import { getHelpArticle } from '../content/helpArticles'

export default function HelpArticle() {
  const { slug } = useParams<{ slug: string }>()
  const article = slug ? getHelpArticle(slug) : undefined

  if (!article) {
    return (
      <div className="help-article-page">
        <article className="help-article">
          <header className="help-article-header">
            <h1>Article Not Found</h1>
          </header>
          <div className="help-article-body">
            <p>The help article you're looking for doesn't exist.</p>
          </div>
        </article>
      </div>
    )
  }

  return (
    <div className="help-article-page">
      <article className="help-article">
        <header className="help-article-header">
          <h1>{article.title}</h1>
          <p className="help-article-meta">Last updated: {article.lastUpdated}</p>
        </header>

        <div className="help-article-body">
          <p>{article.content.intro}</p>
          {article.content.sections.map((section, index) => (
            <div key={index}>
              <h2>{section.heading}</h2>
              <p>{section.content}</p>
            </div>
          ))}
        </div>

        <HelpArticleFeedback articleId={article.id} />
      </article>
    </div>
  )
}
