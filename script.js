// =====================================================
// BIỂU ĐỒ CO2 AI + CO2 THỰC TẾ
// =====================================================
//
// Đây là phần quan trọng đã sửa.
//
// KHÔNG dùng Date làm x-axis kiểu linear.
//
// Dùng labels thời gian thông thường của Chart.js.
//
// AI:
// t -> dự báo t+10
//
// Thực tế:
// t+10 -> giá trị cảm biến thực tế
//
// Hai đường nằm cùng một biểu đồ.
// =====================================================

function updateAIChart() {

    const canvas =
        document.getElementById(
            "aiCo2Chart"
        );


    if (
        !canvas
    ) {

        console.log(
            "Không tìm thấy aiCo2Chart."
        );

        return;

    }


    if (
        aiCo2Chart
    ) {

        aiCo2Chart.destroy();

        aiCo2Chart =
            null;

    }


    const points =
        buildAIChartData();


    if (
        !points ||
        points.length === 0
    ) {

        console.log(
            "Chưa có đủ dữ liệu AI để vẽ."
        );

        return;

    }


    // =============================================
    // TẠO TRỤC THỜI GIAN
    // =============================================

    const timeMap =
        new Map();


    points.forEach(
        function(point) {

            timeMap.set(
                point.aiTimeMs,
                point.aiTime
            );


            timeMap.set(
                point.actualTimeMs,
                point.actualTime
            );

        }
    );


    const sortedTimes =
        Array.from(
            timeMap.keys()
        ).sort(
            function(a, b) {

                return a - b;

            }
        );


    // =============================================
    // NHÃN X
    // =============================================

    const labels =
        sortedTimes.map(
            function(timeMs) {

                return formatChartTime(
                    new Date(timeMs)
                );

            }
        );


    // =============================================
    // DỮ LIỆU AI
    // =============================================

    const aiData =
        new Array(
            sortedTimes.length
        ).fill(null);


    // =============================================
    // DỮ LIỆU THỰC TẾ
    // =============================================

    const actualData =
        new Array(
            sortedTimes.length
        ).fill(null);


    // =============================================
    // ĐƯA AI VÀO ĐÚNG THỜI ĐIỂM t
    // =============================================

    points.forEach(
        function(point) {

            const index =
                sortedTimes.indexOf(
                    point.aiTimeMs
                );


            if (
                index !== -1
            ) {

                aiData[index] =
                    point.prediction;

            }

        }
    );


    // =============================================
    // ĐƯA THỰC TẾ VÀO ĐÚNG THỜI ĐIỂM t+10
    // =============================================

    points.forEach(
        function(point) {

            const index =
                sortedTimes.indexOf(
                    point.actualTimeMs
                );


            if (
                index !== -1
            ) {

                actualData[index] =
                    point.actual;

            }

        }
    );


    console.log(
        "Số điểm biểu đồ AI:",
        points.length
    );


    // =============================================
    // TẠO BIỂU ĐỒ
    // =============================================

    aiCo2Chart =
        new Chart(
            canvas.getContext(
                "2d"
            ),
            {

                type:
                    "line",

                data:
                    {

                        labels:
                            labels,

                        datasets:
                            [

                                // ---------------------------------
                                // AI
                                // ---------------------------------

                                {

                                    label:
                                        "CO₂ AI dự đoán",

                                    data:
                                        aiData,

                                    borderColor:
                                        "#1683e8",

                                    backgroundColor:
                                        "#1683e8",

                                    borderWidth:
                                        3,

                                    tension:
                                        0.2,

                                    pointRadius:
                                        1.5,

                                    pointHoverRadius:
                                        5,

                                    fill:
                                        false,

                                    spanGaps:
                                        false

                                },


                                // ---------------------------------
                                // THỰC TẾ
                                // ---------------------------------

                                {

                                    label:
                                        "CO₂ thực tế",

                                    data:
                                        actualData,

                                    borderColor:
                                        "#ef3b32",

                                    backgroundColor:
                                        "#ef3b32",

                                    borderWidth:
                                        3,

                                    tension:
                                        0.2,

                                    pointRadius:
                                        1.5,

                                    pointHoverRadius:
                                        5,

                                    fill:
                                        false,

                                    spanGaps:
                                        false

                                }

                            ]

                    },


                options:
                    {

                        responsive:
                            true,

                        maintainAspectRatio:
                            true,

                        interaction:
                            {

                                mode:
                                    "index",

                                intersect:
                                    false

                            },


                        plugins:
                            {

                                legend:
                                    {

                                        display:
                                            true,

                                        position:
                                            "top"

                                    },


                                tooltip:
                                    {

                                        mode:
                                            "index",

                                        intersect:
                                            false

                                    }

                            },


                        scales:
                            {

                                x:
                                    {

                                        ticks:
                                            {

                                                maxTicksLimit:
                                                    10,

                                                maxRotation:
                                                    0,

                                                autoSkip:
                                                    true

                                            },

                                        title:
                                            {

                                                display:
                                                    true,

                                                text:
                                                    "Thời gian"

                                            }

                                    },


                                y:
                                    {

                                        beginAtZero:
                                            false,

                                        title:
                                            {

                                                display:
                                                    true,

                                                text:
                                                    "CO₂ (ppm)"

                                            }

                                    }

                            }

                    }

            }
        );

}
