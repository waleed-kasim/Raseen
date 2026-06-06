import { useState, useCallback } from 'react';
import { SRSService } from '../../services/srs';

/**
 * A custom hook to handle standard logic for Quran tool game modes.
 * It manages answer states, score updating, and SRS integration.
 */
export function useSRSEngine({ challengeType, onUpdateScore }) {
    const [answered, setAnswered] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isFlipped, setIsFlipped] = useState(false);

    /**
     * Call this when starting a new question to rest states
     */
    const resetEngine = useCallback(() => {
        setAnswered(false);
        setSelectedOption(null);
        setIsFlipped(false);
    }, []);

    /**
     * Handles answering a question, updating score, and triggering SRS save.
     * @param {number} idx - Index of selected option
     * @param {boolean} isCorrect - Whether the selected option is correct
     * @param {string} pageId - The ID of the page associated with the challenge
     */
    const handleAnswer = useCallback((idx, isCorrect, pageId) => {
        if (answered) return;

        setAnswered(true);
        setSelectedOption(idx);
        setIsFlipped(true);

        if (pageId) {
            const rating = isCorrect ? 5 : 1;
            SRSService.saveChallengeSRS(challengeType, `${challengeType}:${pageId}`, rating);
        }

        if (onUpdateScore) {
            onUpdateScore(isCorrect);
        }
    }, [answered, challengeType, onUpdateScore]);


    return {
        answered,
        selectedOption,
        setSelectedOption, // Sometimes modes need to select without submitting yet
        isFlipped,
        handleAnswer,
        resetEngine
    };
}
