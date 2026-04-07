// Other imports and component code

function App() {
    // ... existing code ...

    return (
        <div>
            {/* Target Weight Input Field */}
            <label htmlFor="targetWeight">Target Weight:</label>
            <input type="number" id="targetWeight" name="targetWeight" />
            
            {isAtCap && (
                <div className="notice warning">
                    Warning: You're at the cap of 15 lbs. Adjust weight accordingly!
                </div>
            )}
            
            <div className="quick-adjust">
                {/* Quick adjust buttons */}
            </div>
            
            {/* Other notices and messages */}
            <div className="notice">
                {/* other messages ... */}
            </div>
        </div>
    );
}