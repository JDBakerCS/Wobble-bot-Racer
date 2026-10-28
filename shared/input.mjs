// Only the current attempt may release its one-shot lock. A missing server
// timestamp cannot settle an interrupted request: it may still be committing.
export function inputFailure(current, attempt, rejected) {
 if (!current || current.id !== attempt.id || current.sessionId !== attempt.sessionId || current.key !== attempt.key) return current;
 return rejected ? null : {...current, uncertain: true};
}

export function confirmInput(current, sessionId, key, stamp) {
 if (!current || !current.uncertain || current.sessionId !== sessionId || current.key !== key || stamp == null) return current;
 return {...current, at: stamp, uncertain: false};
}
