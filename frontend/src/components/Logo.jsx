function Logo({ size = 32 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill="url(#logoGrad)" />
            {/* ticket stub shape */}
            <path
                d="M8 12.5C8 11.12 9.12 10 10.5 10h11c1.38 0 2.5 1.12 2.5 2.5v1a1.5 1.5 0 000 3v1c0 1.38-1.12 2.5-2.5 2.5h-11A2.5 2.5 0 018 17.5v-1a1.5 1.5 0 000-3v-1z"
                fill="white"
                opacity="0.95"
            />
            {/* soundwave bars cut into the ticket */}
            <rect x="12" y="13.5" width="1.4" height="5" rx="0.7" fill="#7C3AED" />
            <rect x="14.6" y="11.5" width="1.4" height="9" rx="0.7" fill="#7C3AED" />
            <rect x="17.2" y="14.5" width="1.4" height="3" rx="0.7" fill="#EC4899" />
            <rect x="19.8" y="12.5" width="1.4" height="7" rx="0.7" fill="#EC4899" />
        </svg>
    );
}

export default Logo;