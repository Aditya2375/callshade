# Original invented teaching corpus, no real companies or transcripts.
RECORDS = [
    {
        "call": "call-01",
        "label": "negative",
        "text": "Revenue declined as demand weakened across regions.",
    },
    {
        "call": "call-01",
        "label": "negative",
        "text": "Margins deteriorated because costs increased sharply.",
    },
    {
        "call": "call-01",
        "label": "neutral",
        "text": "We reported revenue for the quarter.",
    },
    {
        "call": "call-01",
        "label": "neutral",
        "text": "The call includes prepared remarks and questions.",
    },
    {
        "call": "call-01",
        "label": "positive",
        "text": "Demand strengthened and revenue exceeded our plan.",
    },
    {
        "call": "call-01",
        "label": "positive",
        "text": "Margins improved as productivity gains accelerated.",
    },
    {
        "call": "call-02",
        "label": "negative",
        "text": "Orders fell and cancellations increased this quarter.",
    },
    {
        "call": "call-02",
        "label": "negative",
        "text": "We lowered guidance after a disappointing launch.",
    },
    {
        "call": "call-02",
        "label": "neutral",
        "text": "Our fiscal year ends in December.",
    },
    {
        "call": "call-02",
        "label": "neutral",
        "text": "The appendix lists segment revenue and expenses.",
    },
    {
        "call": "call-02",
        "label": "positive",
        "text": "Orders grew with strong customer retention.",
    },
    {
        "call": "call-02",
        "label": "positive",
        "text": "We raised guidance following a successful launch.",
    },
    {
        "call": "call-03",
        "label": "negative",
        "text": "Cash flow weakened and debt pressure increased.",
    },
    {
        "call": "call-03",
        "label": "negative",
        "text": "Sales missed expectations amid persistent delays.",
    },
    {
        "call": "call-03",
        "label": "neutral",
        "text": "Cash flow is presented in the statement.",
    },
    {
        "call": "call-03",
        "label": "neutral",
        "text": "Management will discuss the financial results.",
    },
    {
        "call": "call-03",
        "label": "positive",
        "text": "Cash flow improved and debt pressure eased.",
    },
    {
        "call": "call-03",
        "label": "positive",
        "text": "Sales exceeded expectations with robust growth.",
    },
    {
        "call": "call-04",
        "label": "negative",
        "text": "Customer churn increased and retention deteriorated.",
    },
    {
        "call": "call-04",
        "label": "negative",
        "text": "The outlook weakened as market demand fell.",
    },
    {
        "call": "call-04",
        "label": "neutral",
        "text": "We operate in three reporting segments.",
    },
    {
        "call": "call-04",
        "label": "neutral",
        "text": "The next speaker is our finance director.",
    },
    {
        "call": "call-04",
        "label": "positive",
        "text": "Customer churn declined and retention improved.",
    },
    {
        "call": "call-04",
        "label": "positive",
        "text": "The outlook strengthened as market demand grew.",
    },
    {
        "call": "call-05",
        "label": "negative",
        "text": "We are not pleased with weak bookings.",
    },
    {
        "call": "call-05",
        "label": "negative",
        "text": "Profit declined due to severe supply disruptions.",
    },
    {
        "call": "call-05",
        "label": "neutral",
        "text": "Bookings are recorded when contracts are signed.",
    },
    {
        "call": "call-05",
        "label": "neutral",
        "text": "We will publish the annual report tomorrow.",
    },
    {
        "call": "call-05",
        "label": "positive",
        "text": "We are pleased with strong bookings.",
    },
    {
        "call": "call-05",
        "label": "positive",
        "text": "Profit improved following successful cost reductions.",
    },
    {
        "call": "call-06",
        "label": "negative",
        "text": "Growth slowed and execution remained disappointing.",
    },
    {
        "call": "call-06",
        "label": "negative",
        "text": "The product suffered setbacks and customer losses.",
    },
    {
        "call": "call-06",
        "label": "neutral",
        "text": "The product launched during the third quarter.",
    },
    {
        "call": "call-06",
        "label": "neutral",
        "text": "This discussion covers the reporting period.",
    },
    {
        "call": "call-06",
        "label": "positive",
        "text": "Growth accelerated and execution exceeded expectations.",
    },
    {
        "call": "call-06",
        "label": "positive",
        "text": "The product delivered gains and customer wins.",
    },
    {
        "call": "call-07",
        "label": "negative",
        "text": "We do not expect a strong recovery.",
    },
    {
        "call": "call-07",
        "label": "negative",
        "text": "Our pipeline weakened and conversion rates fell.",
    },
    {
        "call": "call-07",
        "label": "neutral",
        "text": "The pipeline contains contracts in several regions.",
    },
    {
        "call": "call-07",
        "label": "neutral",
        "text": "Please refer to the reconciliation table.",
    },
    {
        "call": "call-07",
        "label": "positive",
        "text": "We expect a strong recovery in demand.",
    },
    {
        "call": "call-07",
        "label": "positive",
        "text": "Our pipeline strengthened and conversion rates improved.",
    },
    {
        "call": "call-08",
        "label": "negative",
        "text": "We faced significant losses and deteriorating liquidity.",
    },
    {
        "call": "call-08",
        "label": "negative",
        "text": "Pricing pressure reduced profit and weakened margins.",
    },
    {
        "call": "call-08",
        "label": "neutral",
        "text": "Liquidity details appear in the balance sheet.",
    },
    {
        "call": "call-08",
        "label": "neutral",
        "text": "The presentation uses our reporting currency.",
    },
    {
        "call": "call-08",
        "label": "positive",
        "text": "We achieved significant gains and improving liquidity.",
    },
    {
        "call": "call-08",
        "label": "positive",
        "text": "Pricing discipline increased profit and strengthened margins.",
    },
    {
        "call": "call-09",
        "label": "negative",
        "text": "The quarter was disappointing with weak sales.",
    },
    {
        "call": "call-09",
        "label": "negative",
        "text": "We reduced our outlook after orders declined.",
    },
    {
        "call": "call-09",
        "label": "neutral",
        "text": "The quarter includes thirteen reporting weeks.",
    },
    {
        "call": "call-09",
        "label": "neutral",
        "text": "The analyst will now ask a question.",
    },
    {
        "call": "call-09",
        "label": "positive",
        "text": "The quarter was successful with strong sales.",
    },
    {
        "call": "call-09",
        "label": "positive",
        "text": "We increased our outlook after orders grew.",
    },
    {
        "call": "call-10",
        "label": "negative",
        "text": "Revenue growth deteriorated and our launch missed expectations.",
    },
    {
        "call": "call-10",
        "label": "negative",
        "text": "We are not pleased as retention weakened.",
    },
    {
        "call": "call-10",
        "label": "neutral",
        "text": "Revenue is shown by reporting segment.",
    },
    {
        "call": "call-10",
        "label": "neutral",
        "text": "The annual meeting occurs after this call.",
    },
    {
        "call": "call-10",
        "label": "positive",
        "text": "Revenue growth accelerated and our launch exceeded expectations.",
    },
    {
        "call": "call-10",
        "label": "positive",
        "text": "We are pleased as retention strengthened.",
    },
    {
        "call": "call-11",
        "label": "negative",
        "text": "Margins weakened after costly delays and cancellations.",
    },
    {
        "call": "call-11",
        "label": "negative",
        "text": "Demand fell sharply and we lowered our outlook.",
    },
    {
        "call": "call-11",
        "label": "neutral",
        "text": "Margins are calculated using reported revenue.",
    },
    {
        "call": "call-11",
        "label": "neutral",
        "text": "The appendix includes the cash flow statement.",
    },
    {
        "call": "call-11",
        "label": "positive",
        "text": "Margins strengthened after productivity gains and cost reductions.",
    },
    {
        "call": "call-11",
        "label": "positive",
        "text": "Demand grew sharply and we raised our outlook.",
    },
    {
        "call": "call-12",
        "label": "negative",
        "text": "Cash flow declined and liquidity pressure increased.",
    },
    {
        "call": "call-12",
        "label": "negative",
        "text": "Our recovery remained disappointing with weak orders.",
    },
    {
        "call": "call-12",
        "label": "neutral",
        "text": "Cash flow figures cover the fiscal quarter.",
    },
    {
        "call": "call-12",
        "label": "neutral",
        "text": "Management will answer questions after prepared remarks.",
    },
    {
        "call": "call-12",
        "label": "positive",
        "text": "Cash flow improved and liquidity pressure eased.",
    },
    {
        "call": "call-12",
        "label": "positive",
        "text": "Our recovery remained strong with growing orders.",
    },
]
