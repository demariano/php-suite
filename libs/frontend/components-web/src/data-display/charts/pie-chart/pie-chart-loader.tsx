import ContentLoader from 'react-content-loader';
import Loader from '../../loader/loader';

export interface PieChartLoaderProps<T> {
    isLegendBottomPositioned?: boolean,
    size: number,
    data: T[]
}

// TODO: add half pie loader

export function PieChartLoader<T extends object>({
    isLegendBottomPositioned, size, data
}: PieChartLoaderProps<T>) {

    return (
        <div className='flex flex-col items-center w-full'>
            {isLegendBottomPositioned
                ? <>
                    <ContentLoader width={size - 50} height={size - 50} viewBox="0 0 176 176"
                        backgroundColor='#EDEFF5' foregroundColor='#C1C4D6' >
                        <path id="0" d="M87.75920858835853, 0.0033126934171008315 A87,87 0 0 1 169.50319433876354,59.39161497116832 L151.48525534524046,65.421032391258 A68,68 0 0 0 87.59340441388943,19.00258923163635 Z" />
                        <path id="1" d="M169.9724614592527, 60.835699141906744 A87,87 0 0 1 87.76680047861718,173.99662072187627 L87.59933830512608,154.9973587251447 A68,68 0 0 0 151.85203884171477,66.54974185804205 Z" />
                        <path id="2" d="M86.24838330768185, 173.99675322877187 A87,87 0 0 1 86.22560763696363,0.0034465253475133295 L86.39472780820147,19.0026938359038 A68,68 0 0 0 86.41252948186627,154.99746229375273 Z" />
                    </ContentLoader >

                    <div className='flex gap-4 justify-center flex-wrap mt-4 mb-6'>
                        {data.map((_, i) =>
                            <div className='flex flex-row gap-2 items-center' key={i}>
                                <Loader className='mt-2 w-4 h-4 rounded' />
                                <Loader className='mt-2 w-12 h-3 rounded' />
                            </div>
                        )}
                    </div>
                </>
                : <ContentLoader width="100%" height={size} viewBox="0 0 588 318"
                    backgroundColor='#EDEFF5' foregroundColor='#C1C4D6' >
                    <path d="M144.5 22.5C166.041 22.5 187.277 27.5981 206.47 37.3776C225.663 47.1571 242.269 61.3402 254.931 78.7673C267.592 96.1944 275.95 116.371 279.32 137.647C282.689 158.923 280.976 180.694 274.319 201.181L248.355 192.745C253.681 176.355 255.052 158.938 252.356 141.917C249.66 124.897 242.974 108.756 232.845 94.8138C222.716 80.8721 209.431 69.5257 194.076 61.7021C178.721 53.8785 161.733 49.8 144.5 49.8V22.5Z" fill="#F8FAFC" />
                    <path d="M274.317 201.189C267.659 221.675 256.247 240.295 241.014 255.526C225.782 270.757 207.16 282.166 186.673 288.822C166.186 295.477 144.414 297.189 123.139 293.818C101.863 290.447 81.6871 282.089 64.2608 269.426L80.3086 247.341C94.2497 257.471 110.39 264.158 127.411 266.855C144.432 269.551 161.849 268.182 178.239 262.857C194.628 257.533 209.525 248.405 221.712 236.221C233.898 224.036 243.027 209.14 248.353 192.751L274.317 201.189Z" fill="#EDEFF5" />
                    <path d="M64.2912 269.448C40.9668 252.51 23.6036 228.622 14.69 201.209C5.77637 173.796 5.77002 144.264 14.6718 116.847L40.6375 125.278C33.516 147.211 33.5211 170.836 40.652 192.767C47.7829 214.698 61.6735 233.808 80.333 247.358L64.2912 269.448Z" fill="#E3E8EF" />
                    <path d="M14.6887 116.795C23.6014 89.3819 40.9639 65.4937 64.2877 48.5545C87.6115 31.6153 115.699 22.4947 144.525 22.5L144.52 49.8C121.459 49.7958 98.9892 57.0922 80.3302 70.6436C61.6711 84.1949 47.7811 103.305 40.6509 125.236L14.6887 116.795Z" fill="#C1C4D6" />
                    <path d="M341.292 76.2043V76.2054V81.792C341.292 82.9307 340.954 83.7946 340.374 84.3735C339.795 84.9523 338.931 85.2904 337.791 85.2904H332.209C331.069 85.2904 330.205 84.9524 329.626 84.3728C329.047 83.7932 328.708 82.9277 328.708 81.7854V76.2054C328.708 75.0667 329.047 74.2028 329.626 73.6239C330.205 73.0451 331.069 72.707 332.209 72.707H337.798C338.938 72.707 339.802 73.0451 340.38 73.6238C340.958 74.2023 341.295 75.0659 341.292 76.2043Z" fill="url(#paint0_linear_2806_38850)" stroke="url(#paint1_linear_2806_38850)"
                        stroke-width="0.75" />
                    <path d="M333.788 80.8368L334.053 81.102L334.319 80.8368L337.745 77.4102L337.482 77.1466L337.745 77.4102C337.792 77.3633 337.875 77.3633 337.922 77.4102C337.968 77.4571 337.968 77.5396 337.922 77.5865L334.142 81.3665C334.118 81.3903 334.086 81.4033 334.053 81.4033C334.021 81.4033 333.989 81.3903 333.965 81.3665L332.079 79.4798C332.032 79.4329 332.032 79.3504 332.079 79.3035C332.125 79.2566 332.208 79.2566 332.255 79.3035L333.788 80.8368Z" fill="url(#paint2_linear_2806_38850)" stroke="url(#paint3_linear_2806_38850)"
                        stroke-width="0.75" />
                    <rect x="351" y="74" width="86"
                        height="10.5" rx="5.25" fill="url(#paint4_linear_2806_38850)" />
                    <path d="M341.292 116.204V116.205V121.792C341.292 122.931 340.954 123.795 340.374 124.373C339.795 124.952 338.931 125.29 337.791 125.29H332.209C331.069 125.29 330.205 124.952 329.626 124.373C329.047 123.793 328.708 122.928 328.708 121.785V116.205C328.708 115.067 329.047 114.203 329.626 113.624C330.205 113.045 331.069 112.707 332.209 112.707H337.798C338.938 112.707 339.802 113.045 340.38 113.624C340.958 114.202 341.295 115.066 341.292 116.204Z" fill="url(#paint5_linear_2806_38850)" stroke="url(#paint6_linear_2806_38850)"
                        stroke-width="0.75" />
                    <path d="M333.788 120.837L334.053 121.102L334.319 120.837L337.745 117.41L337.482 117.147L337.745 117.41C337.792 117.363 337.875 117.363 337.922 117.41C337.968 117.457 337.968 117.54 337.922 117.587L334.142 121.367C334.118 121.39 334.086 121.403 334.053 121.403C334.021 121.403 333.989 121.39 333.965 121.367L332.079 119.48C332.032 119.433 332.032 119.35 332.079 119.303C332.125 119.257 332.208 119.257 332.255 119.303L333.788 120.837Z" fill="url(#paint7_linear_2806_38850)" stroke="url(#paint8_linear_2806_38850)"
                        stroke-width="0.75" />
                    <rect x="351" y="114" width="86"
                        height="10.5" rx="5.25" fill="url(#paint9_linear_2806_38850)" />
                    <path d="M341.292 156.204V156.205V161.792C341.292 162.931 340.954 163.795 340.374 164.373C339.795 164.952 338.931 165.29 337.791 165.29H332.209C331.069 165.29 330.205 164.952 329.626 164.373C329.047 163.793 328.708 162.928 328.708 161.785V156.205C328.708 155.067 329.047 154.203 329.626 153.624C330.205 153.045 331.069 152.707 332.209 152.707H337.798C338.938 152.707 339.802 153.045 340.38 153.624C340.958 154.202 341.295 155.066 341.292 156.204Z" fill="url(#paint10_linear_2806_38850)" stroke="url(#paint11_linear_2806_38850)"
                        stroke-width="0.75" />
                    <path d="M333.788 160.837L334.053 161.102L334.319 160.837L337.745 157.41L337.482 157.147L337.745 157.41C337.792 157.363 337.875 157.363 337.922 157.41C337.968 157.457 337.968 157.54 337.922 157.587L334.142 161.367C334.118 161.39 334.086 161.403 334.053 161.403C334.021 161.403 333.989 161.39 333.965 161.367L332.079 159.48C332.032 159.433 332.032 159.35 332.079 159.303C332.125 159.257 332.208 159.257 332.255 159.303L333.788 160.837Z" fill="url(#paint12_linear_2806_38850)" stroke="url(#paint13_linear_2806_38850)"
                        stroke-width="0.75" />
                    <rect x="351" y="154" width="86"
                        height="10.5" rx="5.25" fill="url(#paint14_linear_2806_38850)" />
                    <path d="M341.292 196.204V196.205V201.792C341.292 202.931 340.954 203.795 340.374 204.373C339.795 204.952 338.931 205.29 337.791 205.29H332.209C331.069 205.29 330.205 204.952 329.626 204.373C329.047 203.793 328.708 202.928 328.708 201.785V196.205C328.708 195.067 329.047 194.203 329.626 193.624C330.205 193.045 331.069 192.707 332.209 192.707H337.798C338.938 192.707 339.802 193.045 340.38 193.624C340.958 194.202 341.295 195.066 341.292 196.204Z" fill="url(#paint15_linear_2806_38850)" stroke="url(#paint16_linear_2806_38850)"
                        stroke-width="0.75" />
                    <path d="M333.788 200.837L334.053 201.102L334.319 200.837L337.745 197.41L337.482 197.147L337.745 197.41C337.792 197.363 337.875 197.363 337.922 197.41C337.968 197.457 337.968 197.54 337.922 197.587L334.142 201.367C334.118 201.39 334.086 201.403 334.053 201.403C334.021 201.403 333.989 201.39 333.965 201.367L332.079 199.48C332.032 199.433 332.032 199.35 332.079 199.303C332.125 199.257 332.208 199.257 332.255 199.303L333.788 200.837Z" fill="url(#paint17_linear_2806_38850)" stroke="url(#paint18_linear_2806_38850)"
                        stroke-width="0.75" />
                    <rect x="351" y="194" width="86"
                        height="10.5" rx="5.25" fill="url(#paint19_linear_2806_38850)" />
                    <path d="M341.292 236.204V236.205V241.792C341.292 242.931 340.954 243.795 340.374 244.373C339.795 244.952 338.931 245.29 337.791 245.29H332.209C331.069 245.29 330.205 244.952 329.626 244.373C329.047 243.793 328.708 242.928 328.708 241.785V236.205C328.708 235.067 329.047 234.203 329.626 233.624C330.205 233.045 331.069 232.707 332.209 232.707H337.798C338.938 232.707 339.802 233.045 340.38 233.624C340.958 234.202 341.295 235.066 341.292 236.204Z" fill="url(#paint20_linear_2806_38850)" stroke="url(#paint21_linear_2806_38850)"
                        stroke-width="0.75" />
                    <path d="M333.788 240.837L334.053 241.102L334.319 240.837L337.745 237.41L337.482 237.147L337.745 237.41C337.792 237.363 337.875 237.363 337.922 237.41C337.968 237.457 337.968 237.54 337.922 237.587L334.142 241.367C334.118 241.39 334.086 241.403 334.053 241.403C334.021 241.403 333.989 241.39 333.965 241.367L332.079 239.48C332.032 239.433 332.032 239.35 332.079 239.303C332.125 239.257 332.208 239.257 332.255 239.303L333.788 240.837Z" fill="url(#paint22_linear_2806_38850)" stroke="url(#paint23_linear_2806_38850)"
                        stroke-width="0.75" />
                    <rect x="351" y="234" width="86"
                        height="10.5" rx="5.25" fill="url(#paint24_linear_2806_38850)" />
                    <path d="M484.292 76.2043V76.2054V81.792C484.292 82.9307 483.954 83.7946 483.374 84.3735C482.795 84.9523 481.931 85.2904 480.791 85.2904H475.209C474.069 85.2904 473.205 84.9524 472.626 84.3728C472.047 83.7932 471.708 82.9277 471.708 81.7854V76.2054C471.708 75.0667 472.047 74.2028 472.626 73.6239C473.205 73.0451 474.069 72.707 475.209 72.707H480.798C481.938 72.707 482.802 73.0451 483.38 73.6238C483.958 74.2023 484.295 75.0659 484.292 76.2043Z" fill="url(#paint25_linear_2806_38850)" stroke="url(#paint26_linear_2806_38850)"
                        stroke-width="0.75" />
                    <path d="M476.788 80.8368L477.053 81.102L477.319 80.8368L480.745 77.4102L480.482 77.1466L480.745 77.4102C480.792 77.3633 480.875 77.3633 480.922 77.4102C480.968 77.4571 480.968 77.5396 480.922 77.5865L477.142 81.3665C477.118 81.3903 477.086 81.4033 477.053 81.4033C477.021 81.4033 476.989 81.3903 476.965 81.3665L475.079 79.4798C475.032 79.4329 475.032 79.3504 475.079 79.3035C475.125 79.2566 475.208 79.2566 475.255 79.3035L476.788 80.8368Z" fill="url(#paint27_linear_2806_38850)" stroke="url(#paint28_linear_2806_38850)"
                        stroke-width="0.75" />
                    <rect x="494" y="74" width="86"
                        height="10.5" rx="5.25" fill="url(#paint29_linear_2806_38850)" />
                    <path d="M484.292 116.204V116.205V121.792C484.292 122.931 483.954 123.795 483.374 124.373C482.795 124.952 481.931 125.29 480.791 125.29H475.209C474.069 125.29 473.205 124.952 472.626 124.373C472.047 123.793 471.708 122.928 471.708 121.785V116.205C471.708 115.067 472.047 114.203 472.626 113.624C473.205 113.045 474.069 112.707 475.209 112.707H480.798C481.938 112.707 482.802 113.045 483.38 113.624C483.958 114.202 484.295 115.066 484.292 116.204Z" fill="url(#paint30_linear_2806_38850)" stroke="url(#paint31_linear_2806_38850)"
                        stroke-width="0.75" />
                    <path d="M476.788 120.837L477.053 121.102L477.319 120.837L480.745 117.41L480.482 117.147L480.745 117.41C480.792 117.363 480.875 117.363 480.922 117.41C480.968 117.457 480.968 117.54 480.922 117.587L477.142 121.367C477.118 121.39 477.086 121.403 477.053 121.403C477.021 121.403 476.989 121.39 476.965 121.367L475.079 119.48C475.032 119.433 475.032 119.35 475.079 119.303C475.125 119.257 475.208 119.257 475.255 119.303L476.788 120.837Z" fill="url(#paint32_linear_2806_38850)" stroke="url(#paint33_linear_2806_38850)"
                        stroke-width="0.75" />
                    <rect x="494" y="114" width="86"
                        height="10.5" rx="5.25" fill="url(#paint34_linear_2806_38850)" />
                    <path d="M484.292 156.204V156.205V161.792C484.292 162.931 483.954 163.795 483.374 164.373C482.795 164.952 481.931 165.29 480.791 165.29H475.209C474.069 165.29 473.205 164.952 472.626 164.373C472.047 163.793 471.708 162.928 471.708 161.785V156.205C471.708 155.067 472.047 154.203 472.626 153.624C473.205 153.045 474.069 152.707 475.209 152.707H480.798C481.938 152.707 482.802 153.045 483.38 153.624C483.958 154.202 484.295 155.066 484.292 156.204Z" fill="url(#paint35_linear_2806_38850)" stroke="url(#paint36_linear_2806_38850)"
                        stroke-width="0.75" />
                    <path d="M476.788 160.837L477.053 161.102L477.319 160.837L480.745 157.41L480.482 157.147L480.745 157.41C480.792 157.363 480.875 157.363 480.922 157.41C480.968 157.457 480.968 157.54 480.922 157.587L477.142 161.367C477.118 161.39 477.086 161.403 477.053 161.403C477.021 161.403 476.989 161.39 476.965 161.367L475.079 159.48C475.032 159.433 475.032 159.35 475.079 159.303C475.125 159.257 475.208 159.257 475.255 159.303L476.788 160.837Z" fill="url(#paint37_linear_2806_38850)" stroke="url(#paint38_linear_2806_38850)"
                        stroke-width="0.75" />
                    <rect x="494" y="154" width="86"
                        height="10.5" rx="5.25" fill="url(#paint39_linear_2806_38850)" />
                    <path d="M484.292 196.204V196.205V201.792C484.292 202.931 483.954 203.795 483.374 204.373C482.795 204.952 481.931 205.29 480.791 205.29H475.209C474.069 205.29 473.205 204.952 472.626 204.373C472.047 203.793 471.708 202.928 471.708 201.785V196.205C471.708 195.067 472.047 194.203 472.626 193.624C473.205 193.045 474.069 192.707 475.209 192.707H480.798C481.938 192.707 482.802 193.045 483.38 193.624C483.958 194.202 484.295 195.066 484.292 196.204Z" fill="url(#paint40_linear_2806_38850)" stroke="url(#paint41_linear_2806_38850)"
                        stroke-width="0.75" />
                    <path d="M476.788 200.837L477.053 201.102L477.319 200.837L480.745 197.41L480.482 197.147L480.745 197.41C480.792 197.363 480.875 197.363 480.922 197.41C480.968 197.457 480.968 197.54 480.922 197.587L477.142 201.367C477.118 201.39 477.086 201.403 477.053 201.403C477.021 201.403 476.989 201.39 476.965 201.367L475.079 199.48C475.032 199.433 475.032 199.35 475.079 199.303C475.125 199.257 475.208 199.257 475.255 199.303L476.788 200.837Z" fill="url(#paint42_linear_2806_38850)" stroke="url(#paint43_linear_2806_38850)"
                        stroke-width="0.75" />
                    <rect x="494" y="194" width="86"
                        height="10.5" rx="5.25" fill="url(#paint44_linear_2806_38850)" />
                    <defs>
                        <linearGradient id="paint0_linear_2806_38850" x1="341.667" y1="79.1157"
                            x2="328.333" y2="79.1157" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint1_linear_2806_38850" x1="341.667" y1="79.1157"
                            x2="328.333" y2="79.1157" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint2_linear_2806_38850" x1="338.332" y1="79.4311"
                            x2="331.668" y2="79.4311" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint3_linear_2806_38850" x1="338.332" y1="79.4311"
                            x2="331.668" y2="79.4311" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint4_linear_2806_38850" x1="437" y1="79.3421"
                            x2="351" y2="79.3421" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint5_linear_2806_38850" x1="341.667" y1="119.116"
                            x2="328.333" y2="119.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint6_linear_2806_38850" x1="341.667" y1="119.116"
                            x2="328.333" y2="119.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint7_linear_2806_38850" x1="338.332" y1="119.431"
                            x2="331.668" y2="119.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint8_linear_2806_38850" x1="338.332" y1="119.431"
                            x2="331.668" y2="119.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint9_linear_2806_38850" x1="437" y1="119.342"
                            x2="351" y2="119.342" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint10_linear_2806_38850" x1="341.667" y1="159.116"
                            x2="328.333" y2="159.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint11_linear_2806_38850" x1="341.667" y1="159.116"
                            x2="328.333" y2="159.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint12_linear_2806_38850" x1="338.332" y1="159.431"
                            x2="331.668" y2="159.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint13_linear_2806_38850" x1="338.332" y1="159.431"
                            x2="331.668" y2="159.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint14_linear_2806_38850" x1="437" y1="159.342"
                            x2="351" y2="159.342" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint15_linear_2806_38850" x1="341.667" y1="199.116"
                            x2="328.333" y2="199.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint16_linear_2806_38850" x1="341.667" y1="199.116"
                            x2="328.333" y2="199.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint17_linear_2806_38850" x1="338.332" y1="199.431"
                            x2="331.668" y2="199.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint18_linear_2806_38850" x1="338.332" y1="199.431"
                            x2="331.668" y2="199.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint19_linear_2806_38850" x1="437" y1="199.342"
                            x2="351" y2="199.342" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint20_linear_2806_38850" x1="341.667" y1="239.116"
                            x2="328.333" y2="239.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint21_linear_2806_38850" x1="341.667" y1="239.116"
                            x2="328.333" y2="239.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint22_linear_2806_38850" x1="338.332" y1="239.431"
                            x2="331.668" y2="239.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint23_linear_2806_38850" x1="338.332" y1="239.431"
                            x2="331.668" y2="239.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint24_linear_2806_38850" x1="437" y1="239.342"
                            x2="351" y2="239.342" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint25_linear_2806_38850" x1="484.667" y1="79.1157"
                            x2="471.333" y2="79.1157" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint26_linear_2806_38850" x1="484.667" y1="79.1157"
                            x2="471.333" y2="79.1157" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint27_linear_2806_38850" x1="481.332" y1="79.4311"
                            x2="474.668" y2="79.4311" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint28_linear_2806_38850" x1="481.332" y1="79.4311"
                            x2="474.668" y2="79.4311" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint29_linear_2806_38850" x1="580" y1="79.3421"
                            x2="494" y2="79.3421" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint30_linear_2806_38850" x1="484.667" y1="119.116"
                            x2="471.333" y2="119.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint31_linear_2806_38850" x1="484.667" y1="119.116"
                            x2="471.333" y2="119.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint32_linear_2806_38850" x1="481.332" y1="119.431"
                            x2="474.668" y2="119.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint33_linear_2806_38850" x1="481.332" y1="119.431"
                            x2="474.668" y2="119.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint34_linear_2806_38850" x1="580" y1="119.342"
                            x2="494" y2="119.342" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint35_linear_2806_38850" x1="484.667" y1="159.116"
                            x2="471.333" y2="159.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint36_linear_2806_38850" x1="484.667" y1="159.116"
                            x2="471.333" y2="159.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint37_linear_2806_38850" x1="481.332" y1="159.431"
                            x2="474.668" y2="159.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint38_linear_2806_38850" x1="481.332" y1="159.431"
                            x2="474.668" y2="159.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint39_linear_2806_38850" x1="580" y1="159.342"
                            x2="494" y2="159.342" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint40_linear_2806_38850" x1="484.667" y1="199.116"
                            x2="471.333" y2="199.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint41_linear_2806_38850" x1="484.667" y1="199.116"
                            x2="471.333" y2="199.116" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint42_linear_2806_38850" x1="481.332" y1="199.431"
                            x2="474.668" y2="199.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint43_linear_2806_38850" x1="481.332" y1="199.431"
                            x2="474.668" y2="199.431" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                        <linearGradient id="paint44_linear_2806_38850" x1="580" y1="199.342"
                            x2="494" y2="199.342" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#EDEFF5" stop-opacity="0.05" />
                            <stop offset="0.5" stop-color="#EDEFF5" />
                        </linearGradient>
                    </defs>
                </ContentLoader>
            }
        </div>
    );
}

export default PieChartLoader;