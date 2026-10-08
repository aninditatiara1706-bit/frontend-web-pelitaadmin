type ParticipantAvatarProps = {
  name: string;
  size?: number;
};

export default function ParticipantAvatar({ name, size = 64 }: ParticipantAvatarProps) {
  return (
    <svg
      role="img"
      aria-label={`Ilustrasi foto profil ${name}`}
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      className="shrink-0 rounded-full bg-purple-50 ring-4 ring-purple-50"
    >
      <circle cx="48" cy="48" r="48" fill="#F3E8FF" />
      <path d="M18 88c3-18 14-29 30-29s27 11 30 29" fill="#D99C78" />
      <path d="M25 45c0-20 10-32 25-32 17 0 25 13 25 32v8H25v-8Z" fill="#24323B" />
      <path d="M30 41c0-13 7-21 18-21 12 0 19 9 19 22v9c0 13-8 21-19 21-10 0-18-9-18-21V41Z" fill="#F2B99A" />
      <path d="M27 42c2-15 9-25 23-25 11 0 18 8 21 19-7-1-13-5-17-10-6 8-15 13-27 16Z" fill="#24323B" />
      <circle cx="41" cy="47" r="2" fill="#29323A" />
      <circle cx="57" cy="47" r="2" fill="#29323A" />
      <path d="M43 57c3 3 8 3 11 0" stroke="#A85F57" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 90c5-16 15-24 29-24s24 8 29 24" fill="#F1C7A9" />
    </svg>
  );
}
