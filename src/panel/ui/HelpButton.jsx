/**
 * The question mark that opens an explanation.
 *
 * One component because there are now two places that offer one -- a sheet's
 * header, beside Done, and a card's header, beside its aside -- and two
 * question marks drawn from two strings is the duplication that matters.
 *
 * **The name comes from the caller.** A `?` read aloud as "help" says nothing
 * about which help; the existing one is *"what the states mean"* and the one
 * on the zeroing card is about zeroing. A shared component with a shared
 * label would have made both of them vaguer than either was.
 *
 * The size is the caller's too. *"rozmiar ma pasowac do przycisku, w roznych
 * kontekstach ten rozmiar moze sie roznic, ale ma byc spojny z otoczeniem"*:
 * beside a 42px Done it is 42px. What stays the same is the shape, the
 * border and the way it answers the pointer.
 */
const HelpButton = ({ label, onPress, className = '' }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onPress}
    className={`shrink-0 rounded-ctl border border-line font-semibold leading-none text-mut transition-colors hover:border-acc hover:text-acc ${className}`}
  >
    ?
  </button>
);

export default HelpButton;
