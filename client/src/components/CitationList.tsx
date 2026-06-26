import React from 'react'
import { Citation } from '../types/index'

interface CitationListProps {
  citations: Citation[]
}

export function CitationList({ citations }: CitationListProps) {
  if (!citations || citations.length === 0) {
    return null
  }

  return (
    <div className="citations">
      <div className="citations-header">Sources:</div>
      <ul className="citations-list">
        {citations.map((citation, index) => (
          <li key={index} className="citation-item">
            <strong>{citation.title}</strong>
            <span className="citation-source">{citation.source}</span>
            {citation.url && (
              <a href={citation.url} target="_blank" rel="noopener noreferrer" className="citation-link">
                View
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
