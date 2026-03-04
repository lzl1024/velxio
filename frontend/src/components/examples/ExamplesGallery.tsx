/**
 * Examples Gallery Component
 *
 * Displays a gallery of example Arduino projects that users can load and run
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { exampleProjects, getCategories, type ExampleProject } from '../../data/examples';
import './ExamplesGallery.css';

interface ExamplesGalleryProps {
  onLoadExample: (example: ExampleProject) => void;
}

export const ExamplesGallery: React.FC<ExamplesGalleryProps> = ({ onLoadExample }) => {
  const [selectedCategory, setSelectedCategory] = useState<ExampleProject['category'] | 'all'>(
    'all'
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    ExampleProject['difficulty'] | 'all'
  >('all');

  const categories = getCategories();

  // Filter examples based on selected category and difficulty
  const filteredExamples = exampleProjects.filter((example) => {
    const categoryMatch = selectedCategory === 'all' || example.category === selectedCategory;
    const difficultyMatch =
      selectedDifficulty === 'all' || example.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const getCategoryIcon = (category: ExampleProject['category']): string => {
    const icons: Record<ExampleProject['category'], string> = {
      basics: '💡',
      sensors: '📡',
      displays: '📺',
      communication: '📶',
      games: '🎮',
      robotics: '🤖',
    };
    return icons[category];
  };

  const getDifficultyColor = (difficulty: ExampleProject['difficulty']): string => {
    const colors: Record<ExampleProject['difficulty'], string> = {
      beginner: '#4ade80',
      intermediate: '#fbbf24',
      advanced: '#f87171',
    };
    return colors[difficulty];
  };

  return (
    <div className="examples-gallery">
      <div className="examples-nav">
        <Link to="/" className="back-link">
          ← Back to Editor
        </Link>
      </div>
      <div className="examples-header">
        <h1>Featured Projects</h1>
        <p>Explore and run example Arduino projects</p>
      </div>

      {/* Filters */}
      <div className="examples-filters">
        <div className="filter-group">
          <label>Category:</label>
          <div className="filter-buttons">
            <button
              className={`filter-button ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                className={`filter-button ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Difficulty:</label>
          <div className="filter-buttons">
            <button
              className={`filter-button ${selectedDifficulty === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedDifficulty('all')}
            >
              All
            </button>
            <button
              className={`filter-button ${selectedDifficulty === 'beginner' ? 'active' : ''}`}
              onClick={() => setSelectedDifficulty('beginner')}
            >
              Beginner
            </button>
            <button
              className={`filter-button ${selectedDifficulty === 'intermediate' ? 'active' : ''}`}
              onClick={() => setSelectedDifficulty('intermediate')}
            >
              Intermediate
            </button>
            <button
              className={`filter-button ${selectedDifficulty === 'advanced' ? 'active' : ''}`}
              onClick={() => setSelectedDifficulty('advanced')}
            >
              Advanced
            </button>
          </div>
        </div>
      </div>

      {/* Examples Grid */}
      <div className="examples-grid">
        {filteredExamples.map((example) => (
          <div
            key={example.id}
            className="example-card"
            onClick={() => onLoadExample(example)}
          >
            <div className="example-thumbnail">
              {example.thumbnail ? (
                <img src={example.thumbnail} alt={example.title} />
              ) : (
                <div className="example-placeholder">
                  <span className="example-icon">{getCategoryIcon(example.category)}</span>
                  <span className="example-components-count">
                    {example.components.length} component{example.components.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
            <div className="example-info">
              <h3 className="example-title">{example.title}</h3>
              <p className="example-description">{example.description}</p>
              <div className="example-meta">
                <span
                  className="example-difficulty"
                  style={{ backgroundColor: getDifficultyColor(example.difficulty) }}
                >
                  {example.difficulty}
                </span>
                <span className="example-category">
                  {getCategoryIcon(example.category)} {example.category}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredExamples.length === 0 && (
        <div className="examples-empty">
          <p>No examples found with the selected filters</p>
        </div>
      )}
    </div>
  );
};
