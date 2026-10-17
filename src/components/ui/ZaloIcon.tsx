import React from 'react';

interface ZaloIconProps {
  className?: string;
  size?: number;
  rounded?: boolean;
}

export function ZaloIcon({ className = 'w-5 h-5', size, rounded = true }: ZaloIconProps) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Background squircle */}
      {rounded ? (
        <rect width="48" height="48" rx="13" fill="#0068FF" />
      ) : null}

      {/* Official Zalo stylized wordmark inside icon */}
      <g transform="translate(6, 12)">
        {/* Letter 'Z' */}
        <path
          d="M2.5 4H14.5L5.5 17.5H15.5V20.5H1.5V17L10.5 4H2.5V4Z"
          fill="white"
        />
        {/* Letter 'a' */}
        <path
          d="M20.5 8C17.5 8 16 10 16 12.5C16 15 17.5 17 20.5 17C21.8 17 22.8 16.5 23.5 15.5V20.5H26.5V9C26.5 8.5 26.2 8 25.5 8H20.5ZM21 14.5C19.5 14.5 18.8 13.5 18.8 12.5C18.8 11.5 19.5 10.5 21 10.5C22.5 10.5 23.5 11.5 23.5 12.5C23.5 13.5 22.5 14.5 21 14.5Z"
          fill="white"
        />
        {/* Letter 'l' */}
        <path
          d="M28.5 2.5H31.5V20.5H28.5V2.5Z"
          fill="white"
        />
        {/* Letter 'o' */}
        <path
          d="M39 8C35.5 8 33 10.5 33 14.5C33 18.5 35.5 21 39 21C42.5 21 45 18.5 45 14.5C45 10.5 42.5 8 39 8ZM39 18.5C37.2 18.5 36 17 36 14.5C36 12 37.2 10.5 39 10.5C40.8 10.5 42 12 42 14.5C42 17 40.8 18.5 39 18.5Z"
          fill="white"
        />
      </g>
    </svg>
  );
}

export default ZaloIcon;
