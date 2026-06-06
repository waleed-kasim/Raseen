import React from 'react';
import TruncatedOption from '../../components/ui/TruncatedOption';

/**
 * OptionsContainer is a shared React-Bootstrap utility component
 * that renders the standard grid of answer options for game modes.
 */
const OptionsContainer = ({ options, answered, selectedOption, onSelect }) => {
    return (
        <div className={`answer-options d-grid gap-2 page-recognition-grid mb-5 ${answered ? '' : 'pb-5'}`}>
            {options.map((opt, idx) => (
                <TruncatedOption
                    key={idx}
                    text={opt.text}
                    isSelected={selectedOption === idx}
                    onSelect={() => !answered && onSelect(idx)}
                    disabled={answered}
                    className={`option-btn ${answered && opt.isCorrect ? 'correct' : ''} 
                        ${answered && selectedOption === idx && !opt.isCorrect ? 'wrong' : ''}`}
                />
            ))}
        </div>
    );
};

export default OptionsContainer;
